import type { IControl, UnifiedMap } from "#app/types/map";

import type { DrawOptions, LatLng, RequiredDrawOptions, Step, StepId } from "#app/types/index";
import { Panel } from "#components/panel";
import { Events } from "#components/map";
import { Control } from "#components/side-control";
import { DrawingMode } from "#components/map/mode";
import { Cursor } from "#components/map/cursor";
import { MouseEvents } from "#components/map/mouse-events/index";
import { uuidv4 } from "#app/utils/helpers";
import { DOM } from "#app/utils/dom";
import { Store, StoreHelpers } from "#app/store/index";
import { Options } from "#app/utils/options";
import { Tiles } from "#components/map/tiles";
import { renderer, Renderer } from "#components/map/renderer";

import type {
  UndoEvent,
  PointAddEvent,
  PointRightClickRemoveEvent,
  PointEnterEvent,
  PointLeaveEvent,
  PointMoveEvent,
  RemoveAllEvent,
  SaveEvent,
  ModeChangeEvent,
} from "#components/map/types";

import "./draw.css";

export default class DrawLibre implements IControl {
  private container: HTMLElement | undefined;
  private store: Store | undefined;
  private mode: DrawingMode | undefined;
  private defaultOptions: RequiredDrawOptions;
  private events: Events | undefined;
  private tiles: Tiles | undefined;
  private panel: Panel | undefined;
  private renderer: Renderer | null = null;
  private control: Control | undefined;
  private cursor: Cursor | undefined;
  private mouseEvents: MouseEvents | undefined;

  static instance: DrawLibre | null = null;

  private constructor(options?: DrawOptions) {
    this.defaultOptions = Options.init(options);

    if (this.defaultOptions.initial) {
      Options.checkInitialStepsOption(this.defaultOptions.initial);
    }
  }

  static getInstance(options?: DrawOptions): DrawLibre {
    if (!DrawLibre.instance) {
      DrawLibre.instance = new DrawLibre(options);
    }
    return DrawLibre.instance;
  }

  /**
   * DO NOT USE IMPLICITLY. PASS TO map.addControl().
   *
   * @example ```ts
   * const map = new Map();
   * const draw = DrawLibre.getInstance();
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
  onAdd = (map: UnifiedMap) => {
    this.store = new Store(this.defaultOptions);
    this.mode = new DrawingMode(this.defaultOptions);
    this.tiles = new Tiles({ map, store: this.store, mode: this.mode, options: this.defaultOptions });
    this.renderer = renderer.initialize({
      map,
      store: this.store,
      options: this.defaultOptions,
      mode: this.mode,
    });
    this.control = new Control({ options: this.defaultOptions, map, mode: this.mode });
    this.mouseEvents = new MouseEvents();
    this.cursor = new Cursor({
      map,
      mode: this.mode,
      mouseEvents: this.mouseEvents,
      store: this.store,
      options: this.defaultOptions,
    });
    this.panel = new Panel({ map, mode: this.mode, options: this.defaultOptions, store: this.store });
    this.events = new Events({
      map,
      store: this.store,
      options: this.defaultOptions,
      panel: this.panel,
      control: this.control,
      mode: this.mode,
      mouseEvents: this.mouseEvents,
    });

    if (this.mode.getMode()) {
      map.fire("mode:initialize");
    }

    this.mode.pingConsumers();
    this.store.pingConsumers();
    this.container = this.control.getContainer();

    return this.container;
  };

  /**
   * DO NOT USE IMPLICITLY. PASS TO map.removeControl().
   *
   * @example ```ts
   * const map = new Map();
   * const draw = DrawLibre.getInstance();
   * map.removeControl(draw)
   * ```
   *
   * Unregister a control on the map and give it a chance to detach event listeners.
   *
   * @param map - the Map this control will be removed from
   */
  onRemove = () => {
    this.cursor?.remove();
    this.tiles?.remove();
    this.events?.removeMapEventsAndConsumers();
    this.panel?.destroy();
    this.store?.reset();
    this.mode?.unsubscribe();
    this.control?.destroy();

    if (this.container) {
      DOM.remove(this.container);
    }
  };

  /**
   * Adds a series of steps to the store. If a step ID is not provided, it will be automatically generated.
   *
   * @param step - The step to add to the store, which can be of type Step or LatLng.
   */
  setSteps = (value: Step[] | LatLng[]) => {
    if (Array.isArray(value)) {
      for (const step of value) {
        const newStep = { ...step, id: (step as Step).id || uuidv4() };
        this.store?.push(newStep);
      }
    } else {
      throw new Error("Invalid argument. Expected an array of steps.");
    }
    this.renderer?.execute();
  };

  /**
   * Retrieves a step from the store by its ID.
   *
   * @param id - The ID of the step to retrieve.
   * @returns The step with the specified ID, or null if not found.
   */
  findStepById = (id: StepId) => {
    return this.store?.findStepById(id);
  };

  /**
   * Retrieves a node from the store by its ID.
   *
   * @param id - The ID of the node to retrieve.
   * @returns The node with the specified ID, or null if not found.
   */
  findNodeById = (id: StepId) => {
    return this.store?.findNodeById(id);
  };

  /**
   * Retrieves all steps from the store, either as an array or as a linked list, based on the type specified.
   *
   * @param type - The type of collection to return, either "array" or "ll" (linked list).
   * @returns An array of all steps or the linked list of steps.
   */
  getAllSteps = (type: "array" | "linkedlist" = "array") => {
    if (type === "array" && this.store) {
      return StoreHelpers.toArray(this.store.head);
    }
    if (type === "linkedlist") {
      return {
        head: this.store?.head,
        tail: this.store?.tail,
        size: this.store?.size,
      };
    }
    throw new Error("Invalid type specified. Use 'array' or 'linkedlist'.");
  };

  setOptions = (fn: (options: RequiredDrawOptions) => RequiredDrawOptions) => {
    this.defaultOptions = fn(this.defaultOptions);
  };

  /**
   * Removes all steps.
   */
  removeAllSteps = () => {
    this.store?.reset();
    this.panel?.destroy();
    this.renderer?.execute();
  };
}

export type {
  DrawOptions,
  RequiredDrawOptions,
  PointAddEvent,
  PointRightClickRemoveEvent,
  PointEnterEvent,
  PointLeaveEvent,
  PointMoveEvent,
  RemoveAllEvent,
  SaveEvent,
  UndoEvent,
  ModeChangeEvent,
  UnifiedMap,
};
