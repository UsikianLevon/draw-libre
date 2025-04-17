import type { EventsProps } from "#types/index";
import type { MapLayerMouseEvent } from "maplibre-gl";

import { uuidv4, Spatial, debounce } from "#utils/helpers";
import { ELAYERS } from "#utils/geo_constants";
import { Tooltip } from "#components/tooltip";
import { togglePointCircleRadius } from "#components/map/tiles/helpers";

import { FireEvents } from "../helpers";
import type { DrawingModeChangeEvent } from "../mode/types";
import { PointHelpers, PointsFilter, PointVisibility } from "./helpers";
import type { PrimaryPointEvents } from ".";
import type { StoreChangeEvent } from "#store/types";

export class FirstPoint {
  #mouseDown: boolean;
  #props: EventsProps;
  #tooltip: Tooltip;
  #events: PrimaryPointEvents;

  constructor(props: EventsProps, baseEvents: PrimaryPointEvents) {
    this.#props = props;
    this.#mouseDown = false;
    this.#events = baseEvents;
    this.#tooltip = new Tooltip();

    this.initLayer()
  }

  #initConsumers = () => {
    const { mode, store } = this.#props;
    mode.addObserver(this.#mapModeConsumer);
    store.addObserver(this.#storeConsumer);
  }

  #removeConsumers = () => {
    const { mode, store } = this.#props;
    mode.removeObserver(this.#mapModeConsumer);
    store.removeObserver(this.#storeConsumer);
  };

  initLayer() {
    const { map } = this.#props;
    map.setLayoutProperty(ELAYERS.FirstPointLayer, "visibility", "visible");
  }

  #initBaseEvents = () => {
    const { map } = this.#props;

    map.on("mouseenter", ELAYERS.FirstPointLayer, this.#events.onPointMouseEnter);
    map.on("mouseleave", ELAYERS.FirstPointLayer, this.#events.onPointMouseLeave);
    map.on("mousedown", ELAYERS.FirstPointLayer, this.#events.onPointMouseDown);
    map.on("mouseup", ELAYERS.FirstPointLayer, this.#events.onPointMouseUp);
    map.on("touchend", ELAYERS.FirstPointLayer, this.#events.onPointMouseUp);
    map.on("touchstart", ELAYERS.FirstPointLayer, this.#events.onPointMouseDown);
  };

  initEvents() {
    const { map } = this.#props;

    map.on("click", ELAYERS.FirstPointLayer, this.#onFirstPointClick);
    map.on("mouseenter", ELAYERS.FirstPointLayer, this.#onFirstPointMouseEnter);
    map.on("mouseleave", ELAYERS.FirstPointLayer, this.#onFirstPointMouseLeave);
    map.on("mouseup", ELAYERS.FirstPointLayer, this.#onFirstPointMouseUp);
    map.on("mousedown", ELAYERS.FirstPointLayer, this.#onFirstPointMouseDown);
    this.#initBaseEvents();
    this.#initConsumers();
  }

  #removeBaseEvents = () => {
    const { map } = this.#props;

    map.off("mouseenter", ELAYERS.FirstPointLayer, this.#events.onPointMouseEnter);
    map.off("mouseleave", ELAYERS.FirstPointLayer, this.#events.onPointMouseLeave);
    map.off("mousedown", ELAYERS.FirstPointLayer, this.#events.onPointMouseDown);
    map.off("mouseup", ELAYERS.FirstPointLayer, this.#events.onPointMouseUp);
    map.off("touchend", ELAYERS.FirstPointLayer, this.#events.onPointMouseUp);
    map.off("touchstart", ELAYERS.FirstPointLayer, this.#events.onPointMouseDown);
  };

  removeEvents() {
    const { map } = this.#props;

    map.off("click", ELAYERS.FirstPointLayer, this.#onFirstPointClick);
    map.off("mouseenter", ELAYERS.FirstPointLayer, this.#onFirstPointMouseEnter);
    map.off("mouseleave", ELAYERS.FirstPointLayer, this.#onFirstPointMouseLeave);
    map.off("mouseup", ELAYERS.FirstPointLayer, this.#onFirstPointMouseUp);
    this.#removeBaseEvents();
    this.#removeConsumers();
  }

  #mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { map, options } = this.#props;
    const { type, data } = event;

    if (type === "MODE_CHANGED") {
      if (data === "line" && !options.modes.line.closeGeometry) {
        PointVisibility.setFirstPointHidden(map);
        PointsFilter.closedGeometry(map)
      } else {
        PointVisibility.setFirstPointVisible(map);
        PointsFilter.default(map)
      }
    }
  };

  #storeConsumer = debounce((event: StoreChangeEvent) => {
    const { map, store, options } = this.#props;

    const { type } = event;
    if (type === "STORE_MUTATED" || type === "STORE_DETACHED") {
      if (Spatial.canCloseGeometry(store, options)) {
        togglePointCircleRadius(map, "large");
      } else {
        togglePointCircleRadius(map, "default");
      }
    }
  }, 10)

  #onFirstPointClick = () => {
    const { store, map, mode, tiles, options } = this.#props;

    if (Spatial.canCloseGeometry(store, options)) {
      const step = Object.assign({}, store.head?.val, {
        id: uuidv4(),
        total: store.size,
      });
      if (options.pointGeneration === "auto" && store.tail?.val) {
        const auxPoint = PointHelpers.createAuxiliaryPoint(store.tail?.val, step);
        store.push(auxPoint);
      }
      Spatial.closeGeometry(store, mode);
      FireEvents.addPoint(step, map, mode);
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
