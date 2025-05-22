import type { EventsCtx, ControlType } from "#app/types/index";
import { HTMLEvent } from "#app/types/helpers";
import { Tooltip } from "#components/tooltip";
import { CURSORS } from "#components/map/cursor/constants";

import { addControlListeners, getButtonLabel, removeControlListeners } from "./helpers";
import { ControlObserver } from "./observer";

export class ControlEvents {
  #tooltip: Tooltip;
  #observer: ControlObserver;

  constructor(private readonly props: EventsCtx) {
    this.#observer = new ControlObserver(props);
    this.#tooltip = new Tooltip();
    this.#initEvents();
  }

  #initEvents() {
    const { control } = this.props;
    if (control) {
      const events = {
        mouseenter: this.onButtonEnter as EventListenerOrEventListenerObject,
        mouseleave: this.onButtonLeave,
      };

      if (control.lineButton) {
        addControlListeners(control.lineButton, {
          ...events,
          click: this.onLineClick,
        });
      }
      if (control.polygonButton) {
        addControlListeners(control.polygonButton, {
          ...events,
          click: this.onPolygonClick,
        });
      }
      if (control.breakButton) {
        addControlListeners(control.breakButton, {
          ...events,
          click: this.onBreakClick,
        });
      }
    }
  }

  #removeEvents() {
    const { control } = this.props;
    if (control) {
      const events = {
        mouseenter: this.onButtonEnter as EventListenerOrEventListenerObject,
        mouseleave: this.onButtonLeave,
      };

      if (control.lineButton) {
        removeControlListeners(control.lineButton, {
          ...events,
          click: this.onLineClick,
        });
      }
      if (control.polygonButton) {
        removeControlListeners(control.polygonButton, {
          ...events,
          click: this.onPolygonClick,
        });
      }
      if (control.breakButton) {
        removeControlListeners(control.breakButton, {
          ...events,
          click: this.onBreakClick,
        });
      }
    }
  }

  remove() {
    this.#observer.removeConsumers();
    this.#removeEvents();
    this.#tooltip.remove();
  }

  onButtonEnter = (event: HTMLEvent<HTMLButtonElement>) => {
    const { options } = this.props;

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
    const { control } = this.props;

    control.lineButton?.classList.remove("control-button-active");
    control.polygonButton?.classList.remove("control-button-active");
    control.breakButton?.classList.remove("control-button-active");
  };

  #initialize = () => {
    const { map, mode } = this.props;
    if (!mode.getMode()) {
      map.fire("mode:initialize");
    }
  };

  onLineClick = () => {
    const { map, mode, renderer, control } = this.props;
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
    const { map, mode, renderer, control } = this.props;
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
    const { map, mode, control } = this.props;
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
