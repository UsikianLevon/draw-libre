import type { ControlType } from "#app/types/index";
import type { HTMLEvent } from "#app/types/helpers";
import { Tooltip } from "#components/tooltip";
import { CURSORS } from "#components/cursor/constants";
import { DOM } from "#app/utils/dom";

import { getButtonLabel } from "./helpers";
import type { Context } from ".";
import type { View } from "./view";

export class Events {
  private tooltip: Tooltip;

  constructor(private readonly ctx: Context & { view: View }) {
    this.tooltip = new Tooltip();
    this.initEvents();
  }

  initEvents() {
    const { lineButton, breakButton, polygonButton } = this.ctx.view;

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

  removeEvents() {
    const { lineButton, breakButton, polygonButton } = this.ctx.view;

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

  remove() {
    this.removeEvents();
    this.tooltip.remove();
  }

  onButtonEnter = (event: HTMLEvent<HTMLButtonElement>) => {
    const { options } = this.ctx;

    const type = event.target.getAttribute("data-type") as ControlType;

    if (type) {
      const label = getButtonLabel(type, options);
      const placement = "left";
      this.tooltip
        .create({
          label,
          placement,
        })
        .setPosition(this.tooltip.getPosition(event, placement));
    }
  };

  onButtonLeave = () => {
    this.tooltip.remove();
  };

  removeActiveClass = () => {
    const { lineButton, breakButton, polygonButton } = this.ctx.view;

    lineButton?.classList.remove("control-button-active");
    polygonButton?.classList.remove("control-button-active");
    breakButton?.classList.remove("control-button-active");
  };

  onLineClick = () => {
    const { mode } = this.ctx;
    const { lineButton } = this.ctx.view;

    if (mode.getMode() === "line") return;

    this.removeActiveClass();
    lineButton?.classList.add("control-button-active");
    mode.setMode("line");
  };

  onPolygonClick = () => {
    const { mode } = this.ctx;
    const { polygonButton } = this.ctx.view;

    if (mode.getMode() === "polygon") return;

    this.removeActiveClass();
    polygonButton?.classList.add("control-button-active");
    mode.setMode("polygon");
  };

  onBreakClick = () => {
    const { map, mode } = this.ctx;
    const { breakButton } = this.ctx.view;

    this.removeActiveClass();
    breakButton?.classList.add("control-button-active");
    mode.setBreak(true);
    map.getCanvasContainer().style.cursor = CURSORS.POINTER;
  };
}
