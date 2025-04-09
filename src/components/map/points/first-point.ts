import type { EventsProps } from "#types/index";
import type { MapLayerMouseEvent } from "maplibre-gl";

import { uuidv4, Spatial } from "#utils/helpers";
import { ELAYERS } from "#utils/geo_constants";
import { Tooltip } from "#components/tooltip";
import { togglePointCircleRadius } from "#components/map/tiles/helpers";

import { FireEvents } from "../helpers";
import type { DrawingModeChangeEvent } from "../mode/types";
import { PointHelpers, PointsFilter, PointVisibility } from "./helpers";

export class FirstPoint {
  #mouseDown: boolean;
  #props: EventsProps;
  #tooltip: Tooltip;

  constructor(props: EventsProps) {
    this.#props = props;
    this.#mouseDown = false;
    this.#tooltip = new Tooltip();
    props.mode.addObserver(this.#mapModeConsumer);
    this.initLayer()
  }

  initLayer() {
    const { map } = this.#props;
    map.setLayoutProperty(ELAYERS.FirstPointLayer, "visibility", "visible");
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
    const { map, store, options } = this.#props;
    const { type, data } = event;

    if (type === "MODE_CHANGED") {
      // what for?
      // if (data === "line" || data === "polygon") {
      //   map.on("click", ELAYERS.FirstPointLayer, this.#onFirstPointClick);
      // } else {
      //   map.off("click", ELAYERS.FirstPointLayer, this.#onFirstPointClick);
      // }
      if (Spatial.canCloseGeometry(store, options)) {
        togglePointCircleRadius(map, "large");
      }
      if (data === "line" && !options.modes.line.closeGeometry) {
        PointVisibility.setFirstPointHidden(map);
        PointsFilter.closedGeometry(map)
      } else {
        PointVisibility.setFirstPointVisible(map);
        PointsFilter.default(map)
      }
    }
  };

  #onFirstPointClick = () => {
    const { store, map, mode, tiles, options } = this.#props;

    if (mode.getMode() === "polygon") {
      map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "visible");
    }
    if (Spatial.canCloseGeometry(store, options)) {
      const step = Object.assign({}, store.head?.val, {
        id: uuidv4(),
        total: store.size,
      });
      if (options.pointGeneration === "auto" && store.tail?.val) {
        PointHelpers.createAuxiliaryPoint(store.tail?.val, step, this.#props);
      }
      Spatial.closeGeometry(store, mode);
      FireEvents.addPoint(step, map, mode);
      togglePointCircleRadius(map, "default");
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
    const { mode, mouseEvents, store, options } = this.#props;
    if (mode.getClosedGeometry() || this.#mouseDown) return;
    mouseEvents.firstPointMouseEnter = true;
    if (Spatial.canCloseGeometry(store, options)) {
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
