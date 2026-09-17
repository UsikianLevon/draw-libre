import type { ControlType } from "#app/types/index";
import type { HTMLEvent } from "#app/types/helpers";
import { Tooltip, type Placement } from "#components/tooltip";
import { CURSORS } from "#components/cursor/constants";
import { DOM } from "#app/dom";

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

  private getPlacement = (button: HTMLElement): Placement => {
    const map = this.ctx.map.getContainer().getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    const buttonCenter = rect.left + rect.width / 2;
    const mapCenter = map.left + map.width / 2;

    return buttonCenter < mapCenter ? "right" : "left";
  };

  onButtonEnter = (event: HTMLEvent<HTMLButtonElement>) => {
    const { options } = this.ctx;

    const type = event.target.getAttribute("data-type") as ControlType;

    if (type) {
      const label = getButtonLabel(type, options);
      const placement = this.getPlacement(event.target);
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

    DOM.setPressed(lineButton, false);
    DOM.setPressed(polygonButton, false);
    DOM.setPressed(breakButton, false);
  };

  onLineClick = () => {
    this.tooltip.remove();
    const { mode } = this.ctx;
    const { lineButton } = this.ctx.view;

    if (mode.getMode() === "line" && !mode.getBreak()) {
      mode.setMode(null);
      this.removeActiveClass();
      return;
    }

    this.removeActiveClass();
    DOM.setPressed(lineButton, true);
    mode.setMode("line");
  };

  onPolygonClick = () => {
    this.tooltip.remove();
    const { mode } = this.ctx;
    const { polygonButton } = this.ctx.view;

    if (mode.getMode() === "polygon" && !mode.getBreak()) {
      mode.setMode(null);
      this.removeActiveClass();
      return;
    }

    this.removeActiveClass();
    DOM.setPressed(polygonButton, true);
    mode.setMode("polygon");
  };

  onBreakClick = () => {
    this.tooltip.remove();
    const { map, mode } = this.ctx;
    const { breakButton } = this.ctx.view;

    this.removeActiveClass();
    DOM.setPressed(breakButton, true);
    mode.setBreak(true);
    map.getCanvasContainer().style.cursor = CURSORS.POINTER;
  };
}
