import type { Map } from "#types/map";

import { Spatial } from "#utils/helpers";
import { DrawingMode } from "#components/map/mode";
import { Store } from "#store/index";

import { MouseEvents } from "../mouse-events";
import { MouseEventsChangeEvent } from "../mouse-events/types";
import { CURSORS, TCursor } from "./constants";

interface CursorProps {
  map: Map;
  mode: DrawingMode;
  mouseEvents: MouseEvents;
  store: Store;
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

  handleMouseLeave = () => {
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
  };

  handleFirstPointMouseEnter = () => {
    const { mode, store } = this.#props;

    if (mode.getClosedGeometry()) {
      this.set(CURSORS.MOVE);
    }
    if (Spatial.canCloseGeometry(store)) {
      this.set(CURSORS.POINTER);
    }
  };

  #initConsumers() {
    const { mouseEvents } = this.#props;

    mouseEvents.addObserver(this.#mouseEventsObserver);
  }

  removeConsumers() {
    const { mouseEvents } = this.#props;

    mouseEvents.removeObserver(this.#mouseEventsObserver);
  }

  #mouseEventsObserver = (event: MouseEventsChangeEvent) => {
    const { mode, mouseEvents } = this.#props;
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
        this.set(CURSORS.POINTER);
        break;
      case "lastPointMouseLeave":
        this.handleMouseLeave();
        break;
      default:
        break;
    }
  };
}
