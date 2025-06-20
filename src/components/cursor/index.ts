import type { UnifiedMap } from "#app/types/map";

import { debounce } from "#app/utils/helpers";
import type { DrawingMode } from "#components/map/mode";
import type { Store } from "#app/store/index";

import type { MouseEvents } from "../map/mouse-events";
import type { MouseEventsChangeEvent } from "../map/mouse-events/types";
import { CURSORS, type TCursor } from "./constants";
import type { RequiredDrawOptions } from "#app/types/index";

interface Context {
  map: UnifiedMap;
  mode: DrawingMode;
  mouseEvents: MouseEvents;
  store: Store;
  options: RequiredDrawOptions;
}

export class Cursor {
  #canvas: HTMLElement;

  constructor(private readonly ctx: Context) {
    this.#canvas = this.ctx.map.getCanvasContainer();
    this.#canvas.style.cursor = ctx.mode.getMode() ? CURSORS.CROSSHAIR : CURSORS.AUTO;
    this.#initConsumers();
  }

  set = (cursor: TCursor) => {
    this.#canvas.style.cursor = cursor;
  };

  get = () => this.#canvas.style.cursor;

  handleMouseLeave = debounce(() => {
    const { mouseEvents, mode } = this.ctx;
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
    const { store } = this.ctx;

    if (store.circular.canClose()) {
      this.set(CURSORS.POINTER);
    }
  }, 10);

  #initConsumers() {
    const { mouseEvents } = this.ctx;

    mouseEvents.addObserver(this.#mouseEventsObserver);
  }

  remove() {
    const { mouseEvents } = this.ctx;

    mouseEvents.removeObserver(this.#mouseEventsObserver);
  }

  #mouseEventsObserver = (event: MouseEventsChangeEvent) => {
    const { mode, mouseEvents, store, options } = this.ctx;
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
        if (!store.circular.isCircular()) {
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
