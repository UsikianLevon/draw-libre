import type { EventsProps, ControlType } from "#types/index";
import { HTMLEvent } from "#types/helpers";
import { Tooltip } from "#components/tooltip";
import { CURSORS } from "#components/map/cursor/constants";

import { addControlListeners, getButtonLabel, removeControlListeners } from "./helpers";
import { ELAYERS } from "#utils/geo_constants";
import { ControlObserver } from "./observer";

export class ControlEvents {
  #props: EventsProps;
  #tooltip: Tooltip;
  #observer: ControlObserver;

  constructor(props: EventsProps) {
    this.#props = props;
    this.#observer = new ControlObserver(props);
    this.#tooltip = new Tooltip();
    this.#initEvents();
  }

  #initEvents() {
    const { control } = this.#props;
    if (control) {
      const events = {
        mouseenter: this.onButtonEnter as EventListenerOrEventListenerObject,
        mouseleave: this.onButtonLeave,
      };

      if (control._line) {
        addControlListeners(control._line, {
          ...events,
          click: this.onLineClick,
        });
      }
      if (control._polygon) {
        addControlListeners(control._polygon, {
          ...events,
          click: this.onPolygonClick,
        });
      }
      if (control._break) {
        addControlListeners(control._break, {
          ...events,
          click: this.onBreakClick,
        });
      }
    }
  }

  #removeEvents() {
    const { control } = this.#props;
    if (control) {
      const events = {
        mouseenter: this.onButtonEnter as EventListenerOrEventListenerObject,
        mouseleave: this.onButtonLeave,
      };

      if (control._line) {
        removeControlListeners(control._line, {
          ...events,
          click: this.onLineClick,
        });
      }
      if (control._polygon) {
        removeControlListeners(control._polygon, {
          ...events,
          click: this.onPolygonClick,
        });
      }
      if (control._break) {
        removeControlListeners(control._break, {
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
    const { options } = this.#props;

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
    const { control } = this.#props;

    control._line?.classList.remove("control-button-active");
    control._polygon?.classList.remove("control-button-active");
    control._break?.classList.remove("control-button-active");
  };

  #initialize = () => {
    const { map, mode } = this.#props;
    if (!mode.getMode()) {
      map.fire("mode:initialize");
    }
  };

  onLineClick = () => {
    const { map, mode, tiles, control } = this.#props;
    this.#initialize();
    this.#removeActiveClass();
    if (mode.getMode() === "line" && !mode.getBreak()) {
      mode.setMode(null);
      map.fire("mode:remove");
      tiles.resetGeometries();
    } else {
      control._line?.classList.add("control-button-active");
      mode.setMode("line");
      tiles.render();
    }
  };

  onPolygonClick = () => {
    const { map, mode, tiles, control } = this.#props;
    this.#initialize();
    this.#removeActiveClass();
    if (mode.getMode() === "polygon" && !mode.getBreak()) {
      mode.setMode(null);
      map.fire("mode:remove");
      map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "visible");
      tiles.resetGeometries();
    } else {
      control._polygon?.classList.add("control-button-active");
      mode.setMode("polygon");
      tiles.render();
    }
  };

  onBreakClick = () => {
    const { map, mode, control } = this.#props;
    if (mode.getBreak()) {
      mode.setMode(null);
      map.fire("mode:remove");
    }
    this.#removeActiveClass();
    control._break?.classList.add("control-button-active");
    mode.setBreak(true);
    map.getCanvasContainer().style.cursor = CURSORS.POINTER;
  };
}
