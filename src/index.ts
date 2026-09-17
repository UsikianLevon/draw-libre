import type { DrawLibreControl, MapLike, UnifiedMap } from "#app/types/map";
import type { EngineMap } from "#app/types/engine";
import type { DrawOptions, LatLng, RequiredDrawOptions, Step, StepId } from "#app/types/index";
import type {
  DrawLibreEventType,
  UndoEvent,
  RedoEvent,
  PointAddEvent,
  PointRemoveEvent,
  PointEnterEvent,
  PointLeaveEvent,
  PointMoveEvent,
  RemoveAllEvent,
  SaveEvent,
  ModeChangeEvent,
  UndoStackChangeEvent,
  RedoStackChangeEvent,
  BreakEvent,
} from "#components/map/types";

import { Panel } from "#components/panel";
import { Control } from "#components/side-control";
import { DrawingMode } from "#components/map/mode";
import { Cursor } from "#components/cursor";
import { GeometryProjection } from "#components/map/line/projection";
import { MouseEvents } from "#components/map/mouse-events/index";
import { DOM } from "#app/dom";
import { Store } from "#app/store/index";
import { renderer, Renderer } from "#components/map/renderer";
import { appendOpenSteps, ERRORS, linkedListToArray } from "#app/store/init";
import { checkInitialStepsOptionOnErrors, initOptions } from "#app/options";

import { Tiles } from "#components/map/tiles";
import { timeline } from "#app/history";
import { MapTimelineAdapter } from "#app/history/map-adapter";
import { Emitter, type DrawLibreSubscription } from "#app/events/emitter";
import { FireEvents } from "#components/map/fire-events";

export default class DrawLibre implements DrawLibreControl {
  static #mounted: DrawLibre | null = null;
  static #busy = false;

  private container: HTMLElement | undefined;
  private store: Store | undefined;
  private mode: DrawingMode | undefined;
  private defaultOptions: RequiredDrawOptions;
  private tiles: Tiles | undefined;
  private panel: Panel | undefined;
  private control: Control | undefined;
  private cursor: Cursor | undefined;
  private mouseEvents: MouseEvents | undefined;
  private timelineAdapter: MapTimelineAdapter | undefined;
  private projection: GeometryProjection | undefined;
  private readonly events = new Emitter<DrawLibreEventType>();

  private renderer: Renderer | null = null;

  constructor(options?: DrawOptions) {
    this.defaultOptions = initOptions(options);

    if (this.defaultOptions.initial) {
      checkInitialStepsOptionOnErrors(this.defaultOptions.initial);
    }
  }

  /**
   * DO NOT USE IMPLICITLY. PASS TO map.addControl().
   *
   * @example ```ts
   * const map = new Map();
   * const draw = new DrawLibre();
   * map.addControl(draw)
   * ```
   *
   * Register a control on the map and give it a chance to register event listeners
   *
   * @param map - the Map this control will be added to
   * @returns The control's container element. This should
   * be created by the control and returned by onAdd without being attached
   * to the DOM: the map will insert the control's element into the DOM
   * as necessary.
   */
  onAdd = (map: MapLike) => {
    if (DrawLibre.#busy) throw new Error(ERRORS["REENTRANT_LIFECYCLE"]);
    if (DrawLibre.#mounted) throw new Error(ERRORS["ALREADY_ADDED_TO_MAP"]);

    DrawLibre.#busy = true;
    DrawLibre.#mounted = this;

    try {
      // maplibre and mapbox maps both provide every method the drawing calls
      const engine = map as EngineMap;
      FireEvents.bind(this.events);
      this.store = new Store(this.defaultOptions);
      this.mode = new DrawingMode(this.defaultOptions);
      this.renderer = renderer.initialize({
        map: engine,
        store: this.store,
        options: this.defaultOptions,
        mode: this.mode,
      });
      this.projection = new GeometryProjection({ map: engine, store: this.store, options: this.defaultOptions });
      this.mouseEvents = new MouseEvents();
      this.panel = new Panel({ map: engine, mode: this.mode, options: this.defaultOptions, store: this.store });
      this.control = new Control({ options: this.defaultOptions, map: engine, mode: this.mode });
      this.tiles = new Tiles({
        map: engine,
        store: this.store,
        mode: this.mode,
        options: this.defaultOptions,
        control: this.control,
        panel: this.panel,
        mouseEvents: this.mouseEvents,
        projection: this.projection,
        events: this.events,
      });
      // map sources exist only from here, rendering earlier inside initialize had nowhere to draw
      this.renderer?.execute();
      this.cursor = new Cursor({
        map: engine,
        mode: this.mode,
        mouseEvents: this.mouseEvents,
        store: this.store,
        options: this.defaultOptions,
      });

      this.timelineAdapter = new MapTimelineAdapter(engine);
      this.mode.pingConsumers();
      this.store.pingConsumers();
      this.container = this.control.getContainer();

      return this.container;
    } catch (error) {
      DrawLibre.#mounted = null;
      this.#teardown();
      throw error;
    } finally {
      DrawLibre.#busy = false;
    }
  };

  #teardown = () => {
    this.projection?.remove();
    this.cursor?.remove();
    this.tiles?.remove();
    this.panel?.destroy();
    this.store?.reset();
    this.mode?.unsubscribe();
    this.control?.destroy();
    this.timelineAdapter?.destroy();
    timeline.resetStacks();
    if (this.container) DOM.remove(this.container);
    FireEvents.unbind(this.events);

    this.container = undefined;
    this.store = undefined;
    this.mode = undefined;
    this.tiles = undefined;
    this.panel = undefined;
    this.control = undefined;
    this.cursor = undefined;
    this.mouseEvents = undefined;
    this.timelineAdapter = undefined;
    this.projection = undefined;
    this.renderer = null;
  };

  #getMountedState = () => {
    const { store, mode, panel } = this;
    if (DrawLibre.#mounted !== this || !store || !mode || !panel) {
      throw new Error(ERRORS["NOT_ADDED_TO_MAP"]);
    }
    return { store, mode, panel };
  };

  /**
   * DO NOT USE IMPLICITLY. PASS TO map.removeControl().
   *
   * @example ```ts
   * const map = new Map();
   * const draw = new DrawLibre();
   * map.removeControl(draw)
   * ```
   *
   * Unregister a control on the map and give it a chance to detach event listeners.
   *
   * @param map - the Map this control will be removed from
   */
  onRemove = () => {
    if (DrawLibre.#busy) throw new Error(ERRORS["REENTRANT_LIFECYCLE"]);
    // tearing down touches the shared timeline, a foreign instance must not do it
    if (DrawLibre.#mounted !== this) return;

    DrawLibre.#busy = true;
    try {
      this.#teardown();
    } finally {
      DrawLibre.#mounted = null;
      DrawLibre.#busy = false;
    }
  };

  /**
   * Replaces all steps in the store. If a step ID is not provided, it will be automatically generated.
   *
   * @param step - The step to add to the store, which can be of type Step or LatLng.
   */
  public setSteps = (value: Step[] | LatLng[]) => {
    if (!Array.isArray(value)) {
      throw new Error(ERRORS["INVALID_STEPS_ARGUMENT"]);
    }
    const { store, mode, panel } = this.#getMountedState();

    store.reset();
    panel.hide();
    mode.reset();
    timeline.resetStacks();
    this.renderer?.resetGeometries();
    appendOpenSteps(store, value, this.defaultOptions.pointGeneration);
    this.renderer?.execute();
  };

  /**
   * Retrieves a step from the store by its ID.
   *
   * @param id - The ID of the step to retrieve.
   * @returns The step with the specified ID, or null if not found.
   */
  public findStepById = (id: StepId) => {
    return this.#getMountedState().store.findStepById(id);
  };

  /**
   * Retrieves a node from the store by its ID.
   *
   * @param id - The ID of the node to retrieve.
   * @returns The node with the specified ID, or null if not found.
   */
  public findNodeById = (id: StepId) => {
    return this.#getMountedState().store.findNodeById(id);
  };

  /**
   * Retrieves all steps from the store, either as an array or as a linked list, based on the type specified.
   *
   * @param type - The type of collection to return, either "array" or "ll" (linked list).
   * @returns An array of all steps or the linked list of steps.
   */
  public getAllSteps = (type: "array" | "linkedlist" = "array") => {
    const { store } = this.#getMountedState();

    if (type === "array") {
      return linkedListToArray(store.head);
    }
    if (type === "linkedlist") {
      return {
        head: store.head,
        tail: store.tail,
        size: store.size,
      };
    }
    throw new Error(ERRORS["INVALID_STEPS_TYPE"]);
  };

  public undo = (e?: Event): void => {
    this.#getMountedState().panel.api().undo(e);
  };

  public redo = (e?: Event): void => {
    this.#getMountedState().panel.api().redo(e);
  };

  public clear = (e?: Event): void => {
    this.#getMountedState().panel.api().clear(e);
  };

  public save = (e?: Event): void => {
    this.#getMountedState().panel.api().save(e);
  };

  public removeAllSteps = (e?: Event): void => {
    this.clear(e);
  };

  public on = <T extends keyof DrawLibreEventType>(
    type: T,
    listener: (event: DrawLibreEventType[T]) => void,
  ): DrawLibreSubscription => this.events.on(type, listener);

  public once = <T extends keyof DrawLibreEventType>(
    type: T,
    listener: (event: DrawLibreEventType[T]) => void,
  ): DrawLibreSubscription => this.events.once(type, listener);

  public off = <T extends keyof DrawLibreEventType>(
    type: T,
    listener: (event: DrawLibreEventType[T]) => void,
  ): void => {
    this.events.off(type, listener);
  };
}

export type {
  DrawOptions,
  RequiredDrawOptions,
  Step,
  LatLng,
  StepId,
  PointAddEvent,
  PointRemoveEvent,
  PointEnterEvent,
  PointLeaveEvent,
  PointMoveEvent,
  RemoveAllEvent,
  SaveEvent,
  UndoEvent,
  RedoEvent,
  ModeChangeEvent,
  UndoStackChangeEvent,
  RedoStackChangeEvent,
  BreakEvent,
  DrawLibreEventType,
  DrawLibreSubscription,
  MapLike,
  DrawLibreControl,
  UnifiedMap,
};
