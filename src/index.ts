import type { IControl, Map } from "#types/map";

import type { DrawOptions, LatLng, RequiredDrawOptions, Step, StepId } from "#types/index";
import { Panel } from "#components/last-point-panel";
import { Tiles } from "#components/map/tiles";
import { Events } from "#components/map";
import { Control } from "#components/side-control";
import { DrawingMode } from "#components/map/mode";
import { Cursor } from "#components/map/cursor";
import { MouseEvents } from "#components/map/mouse-events/index";
import { uuidv4 } from "#utils/helpers";
import { DOM } from "#utils/dom";
import { Store, StoreHelpers } from "#store/index";
import { Options } from "#utils/options";
import { EVENTS } from "#utils/constants";
import type {
  UndoEvent,
  PointAddEvent,
  PointDoubleClickEvent,
  PointEnterEvent,
  PointLeaveEvent,
  PointMoveEvent,
  RemoveAllEvent,
  SaveEvent,
  ModeChangeEvent,
} from "#components/map/types";

import "./draw.css";

export default class DrawLibre implements IControl {
  #container: HTMLElement | undefined;
  #store: Store | undefined;
  #mode: DrawingMode | undefined;
  #defaultOptions: RequiredDrawOptions;
  #events: Events | undefined;
  #tiles: Tiles | undefined;
  #panel: Panel | undefined;
  #cursor: Cursor | undefined;
  #mouseEvents: MouseEvents | undefined;

  static #instance: DrawLibre | null = null;
  static #instanceCreated = false;

  private constructor(options?: DrawOptions) {
    this.#defaultOptions = Options.init(options);
    if (this.#defaultOptions.initial) {
      Options.checkInitialStepsOption(this.#defaultOptions.initial);
    }

    if (DrawLibre.#instanceCreated) {
      throw new Error("Use 'DrawLibre.getInstance()' instead of 'new DrawLibre()'.");
    }

    DrawLibre.#instanceCreated = true;
    this.#store = undefined;
    this.#mode = undefined;
    this.#events = undefined;
    this.#tiles = undefined;
    this.#panel = undefined;
    this.#mouseEvents = undefined;
    this.#cursor = undefined;
  }

  public static getInstance(options?: DrawOptions) {
    if (!DrawLibre.#instance) {
      DrawLibre.#instance = new DrawLibre(options);
    }
    return DrawLibre.#instance;
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
  onAdd(map: Map) {
    this.#store = new Store(this.#defaultOptions);
    this.#panel = new Panel({ map, options: this.#defaultOptions, store: this.#store });
    this.#mode = new DrawingMode(this.#defaultOptions);
    this.#tiles = new Tiles({ map, store: this.#store, options: this.#defaultOptions, mode: this.#mode });
    const control = new Control({ options: this.#defaultOptions, mode: this.#mode });
    this.#mouseEvents = new MouseEvents();
    this.#cursor = new Cursor({ map, mode: this.#mode, mouseEvents: this.#mouseEvents, store: this.#store });
    this.#events = new Events({
      map,
      store: this.#store,
      options: this.#defaultOptions,
      panel: this.#panel,
      control,
      mode: this.#mode,
      tiles: this.#tiles,
      mouseEvents: this.#mouseEvents,
    });

    this.#mode.pingConsumers();
    this.#container = control.getContainer();

    return this.#container;
  }

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
  onRemove() {
    this.#cursor?.removeConsumers();
    this.#tiles?.removeTiles();
    this.#events?.removeMapEventsAndConsumers();
    this.#panel?.removePanel();
    this.#store?.reset();
    this.#mode?.unsubscribe();

    if (this.#container) {
      DOM.remove(this.#container);
    }
  }

  /**
   * Adds a series of steps to the store. If a step ID is not provided, it will be automatically generated.
   *
   * @param step - The step to add to the store, which can be of type Step or LatLng.
   */
  setSteps = (value: Step[] | LatLng[]) => {
    if (Array.isArray(value)) {
      value.forEach((step) => {
        const newStep = { ...step, id: (step as Step)["id"] || uuidv4() };
        this.#store?.push(newStep);
      });
    } else {
      throw new Error("Invalid argument. Expected an array of steps.");
    }
    this.#tiles?.render();
  };

  /**
   * Retrieves a step from the store by its ID. This method is called by {@link map.findStepById}
   * internally.
   *
   * @param id - The ID of the step to retrieve.
   * @returns The step with the specified ID, or undefined if not found.
   */
  findStepById = (id: StepId) => {
    return this.#store?.findStepById(id);
  };

  /**
   * Retrieves all steps from the store, either as an array or as a linked list, based on the type specified.
   * This method is called by {@link map.getAllSteps}
   * internally.
   *
   * @param type - The type of collection to return, either "array" or "ll" (linked list).
   * @returns An array of all steps or the linked list of steps.
   */
  getAllSteps = (type: "array" | "linkedlist" = "array") => {
    if (type === "array" && this.#store) {
      return StoreHelpers.toArray(this.#store.head);
    }
    if (type === "linkedlist") {
      return this.#store;
    }
    throw new Error("Invalid type specified. Use 'array' or 'linkedlist'.");
  };

  setOptions = (fn: (options: RequiredDrawOptions) => RequiredDrawOptions) => {
    this.#defaultOptions = fn(this.#defaultOptions);
  };

  /**
   * Removes all steps.
   */
  removeAllSteps = () => {
    this.#store?.reset();
    this.#panel?.removePanel();
    this.#tiles?.render();
  };
}

export type {
  RequiredDrawOptions,
  PointAddEvent,
  PointDoubleClickEvent,
  PointEnterEvent,
  PointLeaveEvent,
  PointMoveEvent,
  RemoveAllEvent,
  SaveEvent,
  UndoEvent,
  ModeChangeEvent,
};
export { EVENTS as DRAW_LIBRE_EVENTS };
