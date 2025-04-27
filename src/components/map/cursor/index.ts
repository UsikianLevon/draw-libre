import type { CustomMap } from "#types/map";

import { debounce, Spatial } from "#utils/helpers";
import type { DrawingMode } from "#components/map/mode";
import type { Store } from "#store/index";

import type { MouseEvents } from "../mouse-events";
import type { MouseEventsChangeEvent } from "../mouse-events/types";
import { CURSORS, type TCursor } from "./constants";
import type { RequiredDrawOptions } from "#types/index";

interface CursorProps {
  map: CustomMap;
  mode: DrawingMode;
  mouseEvents: MouseEvents;
  store: Store;
  options: RequiredDrawOptions;
}

export class Cursor {
  #props: CursorProps;
  #canvas: HTMLElement;

  // map: Map, mode: DrawingMode, mouseEvents: MouseEvents, store: Store
  constructor(props: CursorProps) {
    this.#props = props;
    this.#canvas = this.#props.map.getCanvasContainer();
    this.#canvas.style.cursor = props.mode.getMode() ? CURSORS.CROSSHAIR : CURSORS.AUTO;
    this.#initConsumers();
  }

  set = (cursor: TCursor) => {
    this.#canvas.style.cursor = cursor;
  };

  get = () => this.#canvas.style.cursor;

  handleMouseLeave = debounce(() => {
    const { mouseEvents, mode } = this.#props;
    if (mouseEvents.pointMouseDown) return;
    if (!mode.getMode()) {
      this.set(CURSORS.AUTO);
      return;
    }
    if (mode.getClosedGeometry()) {
      this.set(CURSORS.AUTO);
    } else {
      this.set(CURSORS.CROSSHAIR);
    }
  }, 10);

  handleFirstPointMouseEnter = debounce(() => {
    const { store, options } = this.#props;

    if (Spatial.canCloseGeometry(store, options)) {
      this.set(CURSORS.POINTER);
    }
  }, 10);

  #initConsumers() {
    const { mouseEvents } = this.#props;

    mouseEvents.addObserver(this.#mouseEventsObserver);
  }

  removeConsumers() {
    const { mouseEvents } = this.#props;

    mouseEvents.removeObserver(this.#mouseEventsObserver);
  }

  #mouseEventsObserver = (event: MouseEventsChangeEvent) => {
    const { mode, mouseEvents, store, options } = this.#props;
    if (mode.getBreak()) return;

    const { type, data } = event;

    if (!data) return;

    switch (type) {
      case "pointMouseDown":
        this.set(CURSORS.GRABBING);
        break;
      case "pointMouseUp":
        this.set(CURSORS.GRAB);
        break;
      case "pointMouseEnter":
        if (mouseEvents.pointMouseDown) return;
        this.set(CURSORS.GRAB);
        break;
      case "pointMouseLeave":
        this.handleMouseLeave();
        break;
      case "lineMouseEnter":
        if (mouseEvents.pointMouseDown) return;
        this.set(CURSORS.POINTER);
        break;
      case "lineMouseLeave":
        this.handleMouseLeave();
        break;
      case "firstPointMouseEnter":
        this.handleFirstPointMouseEnter();
        break;
      case "firstPointMouseLeave":
        this.handleMouseLeave();
        break;
      case "lastPointMouseEnter":
        if (!Spatial.isClosedGeometry(store, options)) {
          this.set(CURSORS.POINTER);
        }
        break;
      case "lastPointMouseLeave":
        this.handleMouseLeave();
        break;
      default:
        break;
    }
  };
}
