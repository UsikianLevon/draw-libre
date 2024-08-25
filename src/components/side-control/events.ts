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
  }

  initEvents() {
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
      this.#tooltip
        .create({
          label,
          placement: "left",
        })
        .setPosition(this.#tooltip.getPosition(event, "left"));
    }
  };

  onButtonLeave = () => {
    this.#tooltip.remove();
  };

  onLineClick = () => {
    const { mode, tiles } = this.#props;
    mode.setMode("line");
    tiles.resetGeometries();
    tiles.render();
  };

  onPolygonClick = () => {
    const { map, mode, tiles } = this.#props;
    mode.setMode("polygon");
    if (mode.isPolygon()) {
      map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "visible");
    }
    tiles.resetGeometries();
    tiles.render();
  };

  onBreakClick = () => {
    const { map, mode } = this.#props;

    mode.setBreak(true);
    map.getCanvasContainer().style.cursor = CURSORS.POINTER;
  };
}
