import type { EventsCtx, ControlType } from "#app/types/index";
import { HTMLEvent } from "#app/types/helpers";
import { Tooltip } from "#components/tooltip";
import { CURSORS } from "#components/map/cursor/constants";

import { getButtonLabel } from "./helpers";
import { ControlObserver } from "./observer";
import { DOM } from "#app/utils/dom";
import { renderer } from "#components/map/renderer";

export class ControlEvents {
  #tooltip: Tooltip;
  #observer: ControlObserver;

  constructor(private readonly ctx: EventsCtx) {
    this.#observer = new ControlObserver(ctx);
    this.#tooltip = new Tooltip();
    this.#initEvents();
  }

  #initEvents() {
    const { control } = this.ctx;
    if (control) {
      const { breakButton, lineButton, polygonButton } = control;
      if (lineButton) {
        DOM.addEventListener(lineButton, "click", this.onLineClick);
        DOM.addEventListener(lineButton, "mouseenter", this.onButtonEnter as EventListenerOrEventListenerObject);
        DOM.addEventListener(lineButton, "mouseleave", this.onButtonLeave);
      }
      if (polygonButton) {
        DOM.addEventListener(polygonButton, "click", this.onPolygonClick);
        DOM.addEventListener(polygonButton, "mouseenter", this.onButtonEnter as EventListenerOrEventListenerObject);
        DOM.addEventListener(polygonButton, "mouseleave", this.onButtonLeave);
      }
      if (breakButton) {
        DOM.addEventListener(breakButton, "click", this.onBreakClick);
        DOM.addEventListener(breakButton, "mouseenter", this.onButtonEnter as EventListenerOrEventListenerObject);
        DOM.addEventListener(breakButton, "mouseleave", this.onButtonLeave);
      }
    }
  }

  #removeEvents() {
    const { control } = this.ctx;
    if (control) {
      const { breakButton, lineButton, polygonButton } = control;
      if (lineButton) {
        DOM.removeEventListener(lineButton, "click", this.onLineClick);
        DOM.removeEventListener(lineButton, "mouseenter", this.onButtonEnter as EventListenerOrEventListenerObject);
        DOM.removeEventListener(lineButton, "mouseleave", this.onButtonLeave);
      }
      if (polygonButton) {
        DOM.removeEventListener(polygonButton, "click", this.onPolygonClick);
        DOM.removeEventListener(polygonButton, "mouseenter", this.onButtonEnter as EventListenerOrEventListenerObject);
        DOM.removeEventListener(polygonButton, "mouseleave", this.onButtonLeave);
      }
      if (breakButton) {
        DOM.removeEventListener(breakButton, "click", this.onBreakClick);
        DOM.removeEventListener(breakButton, "mouseenter", this.onButtonEnter as EventListenerOrEventListenerObject);
        DOM.removeEventListener(breakButton, "mouseleave", this.onButtonLeave);
      }
    }
  }

  remove() {
    this.#observer.removeConsumers();
    this.#removeEvents();
    this.#tooltip.remove();
  }

  onButtonEnter = (event: HTMLEvent<HTMLButtonElement>) => {
    const { options } = this.ctx;

    const type = event.target.getAttribute("data-type") as ControlType;

    if (type) {
      const label = getButtonLabel(type, options);
      const placement = "left";
      this.#tooltip
        .create({
          label,
          placement,
        })
        .setPosition(this.#tooltip.getPosition(event, placement));
    }
  };

  onButtonLeave = () => {
    this.#tooltip.remove();
  };

  #removeActiveClass = () => {
    const { control } = this.ctx;

    control.lineButton?.classList.remove("control-button-active");
    control.polygonButton?.classList.remove("control-button-active");
    control.breakButton?.classList.remove("control-button-active");
  };

  #initialize = () => {
    const { map, mode } = this.ctx;
    if (!mode.getMode()) {
      map.fire("mode:initialize");
    }
  };

  onLineClick = () => {
    const { map, mode, control } = this.ctx;
    this.#initialize();
    this.#removeActiveClass();
    if (mode.getMode() === "line" && !mode.getBreak()) {
      mode.setMode(null);
      map.fire("mode:remove");
      renderer.resetGeometries();
    } else {
      control.lineButton?.classList.add("control-button-active");
      mode.setMode("line");
      renderer.execute();
    }
  };

  onPolygonClick = () => {
    const { map, mode, control } = this.ctx;
    this.#initialize();
    this.#removeActiveClass();
    if (mode.getMode() === "polygon" && !mode.getBreak()) {
      mode.setMode(null);
      map.fire("mode:remove");
      renderer.resetGeometries();
    } else {
      control.polygonButton?.classList.add("control-button-active");
      mode.setMode("polygon");
      renderer.execute();
    }
  };

  onBreakClick = () => {
    const { map, mode, control } = this.ctx;
    if (mode.getBreak()) {
      mode.setMode(null);
      map.fire("mode:remove");
    }
    this.#removeActiveClass();
    control.breakButton?.classList.add("control-button-active");
    mode.setBreak(true);
    map.getCanvasContainer().style.cursor = CURSORS.POINTER;
  };
}
