import type { MapLayerMouseEvent } from "maplibre-gl";
import type { EventsProps } from "#types/index";

import { uuidv4, Spatial } from "#utils/helpers";
import { ELAYERS } from "#utils/geo_constants";
import { Tooltip } from "#components/tooltip";
import { TilesHelpers } from "#components/map/tiles/helpers";

import { FireEvents } from "../helpers";
import { DrawingModeChangeEvent } from "../mode/types";

export class FirstPoint {
  #mouseDown: boolean;
  #props: EventsProps;
  #tooltip: Tooltip;

  constructor(props: EventsProps) {
    this.#props = props;
    this.#mouseDown = false;
    this.#tooltip = new Tooltip();
    props.mode.addObserver(this.#mapModeConsumer);
  }

  initEvents() {
    const { map } = this.#props;

    map.on("click", ELAYERS.FirstPointLayer, this.#onFirstPointClick);
    map.on("mouseenter", ELAYERS.FirstPointLayer, this.#onFirstPointMouseEnter);
    map.on("mouseleave", ELAYERS.FirstPointLayer, this.#onFirstPointMouseLeave);
    map.on("mouseup", ELAYERS.FirstPointLayer, this.#onFirstPointMouseUp);
    map.on("mousedown", ELAYERS.FirstPointLayer, this.#onFirstPointMouseDown);
  }

  removeEvents() {
    const { map } = this.#props;

    map.off("click", ELAYERS.FirstPointLayer, this.#onFirstPointClick);
    map.off("mouseenter", ELAYERS.FirstPointLayer, this.#onFirstPointMouseEnter);
    map.off("mouseleave", ELAYERS.FirstPointLayer, this.#onFirstPointMouseLeave);
    map.off("mouseup", ELAYERS.FirstPointLayer, this.#onFirstPointMouseUp);
  }

  #mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { map, store } = this.#props;
    const { type, data } = event;

    if (type === "MODE_CHANGED") {
      if (data === "line" || data === "polygon") {
        map.on("click", ELAYERS.FirstPointLayer, this.#onFirstPointClick);
      } else {
        map.off("click", ELAYERS.FirstPointLayer, this.#onFirstPointClick);
      }
      if (Spatial.canCloseGeometry(store)) {
        TilesHelpers.togglePointCircleRadius(map, "large");
      }
    }
  };

  #onFirstPointClick = () => {
    const { store, map, mode, tiles } = this.#props;

    if (mode.getMode() === "polygon") {
      map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "visible");
    }

    if (Spatial.canCloseGeometry(store)) {
      Spatial.closeGeometry(store, mode);
      const step = Object.assign({}, store.head?.val, {
        id: uuidv4(),
        total: store.size,
      });
      FireEvents.addPoint(step, map, mode);
      TilesHelpers.togglePointCircleRadius(map, "default");
      tiles.render();
    }
  };

  #onFirstPointMouseDown = () => {
    this.#mouseDown = true;
    this.#tooltip.remove();
  };

  #onFirstPointMouseUp = () => {
    this.#mouseDown = false;
  };

  #onFirstPointMouseLeave = () => {
    const { mouseEvents } = this.#props;

    if (this.#mouseDown) return;

    mouseEvents.firstPointMouseLeave = true;
    this.#tooltip.remove();
  };

  #getTitle = () => {
    const { mode, options } = this.#props;

    if (mode.getMode() === "line" && options.modes.line.closeGeometry) {
      return options.locale.closeLine;
    }

    if (mode.getMode() === "polygon") {
      return options.locale.createPolygon;
    }

    return "";
  };

  #onFirstPointMouseEnter = (event: MapLayerMouseEvent) => {
    const { mode, mouseEvents, store } = this.#props;
    if (mode.getClosedGeometry() || this.#mouseDown) return;
    mouseEvents.firstPointMouseEnter = true;
    if (Spatial.canCloseGeometry(store)) {
      const { x, y } = event.originalEvent;
      if (x && y) {
        const Y_OFFSET = 14;

        this.#tooltip.create({ label: this.#getTitle(), placement: "bottom" });

        const X_OFFSET = this.#tooltip._label ? this.#tooltip._label.clientWidth / 2 : 0;
        this.#tooltip.setPosition({ x: x - X_OFFSET, y: y + Y_OFFSET });
      }
    }
  };
}
