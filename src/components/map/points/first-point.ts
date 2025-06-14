import type { MapLayerMouseEvent } from "maplibre-gl";

import { ELAYERS } from "#app/utils/geo_constants";
import { Tooltip } from "#components/tooltip";
import { togglePointCircleRadius } from "#components/map/tiles/utils";
import type { StoreChangeEvent, StoreChangeEventKeys } from "#app/store/types";
import { timeline } from "#app/history";

import type { DrawingModeChangeEvent } from "../mode/types";
import { PointsFilter, PointVisibility } from "./helpers";
import type { PrimaryPointEvents } from ".";
import { CloseGeometryCommand } from "./commands/close-geometry";
import type { TilesContext } from "../tiles";
import { renderer } from "../renderer";

export class FirstPoint {
  #mouseDown: boolean;
  #tooltip: Tooltip;

  constructor(
    private readonly ctx: TilesContext,
    private readonly baseEvents: PrimaryPointEvents,
  ) {
    this.#mouseDown = false;
    this.#tooltip = new Tooltip();

    this.initLayer();
    this.initEvents();
  }

  private initConsumers = () => {
    const { mode, store } = this.ctx;
    mode.addObserver(this.onMapModeChanggeConsumer);
    store.addObserver(this.onStoreChangeConsumer);
  };

  private removeConsumers = () => {
    const { mode, store } = this.ctx;
    mode.removeObserver(this.onMapModeChanggeConsumer);
    store.removeObserver(this.onStoreChangeConsumer);
  };

  public initLayer() {
    const { map } = this.ctx;
    if (map.getLayer(ELAYERS.FirstPointLayer)) {
      map.setLayoutProperty(ELAYERS.FirstPointLayer, "visibility", "visible");
    }
  }

  private initBaseEvents = () => {
    const { map } = this.ctx;

    map.on("mouseenter", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseEnter);
    map.on("mouseleave", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseLeave);
    map.on("mousedown", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseDown);
    map.on("mouseup", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseUp);
    map.on("touchend", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseUp);
    map.on("touchstart", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseDown);
  };

  private initEvents() {
    const { map } = this.ctx;

    map.on("click", ELAYERS.FirstPointLayer, this.onFirstPointClick);
    map.on("mouseenter", ELAYERS.FirstPointLayer, this.onFirstPointMouseEnter);
    map.on("mouseleave", ELAYERS.FirstPointLayer, this.onFirstPointMouseLeave);
    map.on("mouseup", ELAYERS.FirstPointLayer, this.onFirstPointMouseUp);
    map.on("mousedown", ELAYERS.FirstPointLayer, this.onFirstPointMouseDown);
    this.initBaseEvents();
    this.initConsumers();
  }

  private removeBaseEvents = () => {
    const { map } = this.ctx;

    map.off("mouseenter", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseEnter);
    map.off("mouseleave", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseLeave);
    map.off("mousedown", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseDown);
    map.off("mouseup", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseUp);
    map.off("touchend", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseUp);
    map.off("touchstart", ELAYERS.FirstPointLayer, this.baseEvents.onPointMouseDown);
  };

  public removeEvents() {
    const { map } = this.ctx;

    map.off("click", ELAYERS.FirstPointLayer, this.onFirstPointClick);
    map.off("mouseenter", ELAYERS.FirstPointLayer, this.onFirstPointMouseEnter);
    map.off("mouseleave", ELAYERS.FirstPointLayer, this.onFirstPointMouseLeave);
    map.off("mouseup", ELAYERS.FirstPointLayer, this.onFirstPointMouseUp);
    this.removeBaseEvents();
    this.removeConsumers();
  }

  private onMapModeChanggeConsumer = (event: DrawingModeChangeEvent) => {
    const { map, options } = this.ctx;
    const { type, data } = event;

    if (type === "MODE_CHANGED") {
      if (data === "line" && !options.modes.line.closeGeometry) {
        PointVisibility.setFirstPointHidden(map);
        PointsFilter.closedGeometry(map);
      } else {
        PointVisibility.setFirstPointVisible(map);
        PointsFilter.default(map);
      }
    }
  };

  private onStoreChangeConsumer = (event: StoreChangeEvent) => {
    const { map, store } = this.ctx;
    const { type } = event;

    const events = [
      "STORE_MUTATED",
      "STORE_POINT_INSERTED",
      "STORE_CLOSE_GEOMETRY",
      "STORE_BREAK_GEOMETRY",
      "STORE_CLEARED",
    ] as StoreChangeEventKeys[];
    if (events.includes(type)) {
      if (store.circular.canClose()) {
        togglePointCircleRadius(map, "large");
      } else {
        togglePointCircleRadius(map, "default");
      }
    }
  };

  private onFirstPointClick = () => {
    const { store, mode, options } = this.ctx;

    if (store.circular.canClose()) {
      timeline.commit(new CloseGeometryCommand(store, mode, options));

      renderer.execute();
    }
  };

  private onFirstPointMouseDown = () => {
    this.#mouseDown = true;
    this.#tooltip.remove();
  };

  private onFirstPointMouseUp = () => {
    this.#mouseDown = false;
  };

  private onFirstPointMouseLeave = () => {
    const { mouseEvents } = this.ctx;

    if (this.#mouseDown) return;

    mouseEvents.firstPointMouseLeave = true;
    this.#tooltip.remove();
  };

  private getTitle = () => {
    const { mode, options } = this.ctx;

    if (mode.getMode() === "line" && options.modes.line.closeGeometry) {
      return options.locale.closeLine;
    }

    if (mode.getMode() === "polygon") {
      return options.locale.createPolygon;
    }

    return "";
  };

  private onFirstPointMouseEnter = (event: MapLayerMouseEvent) => {
    const { mode, mouseEvents, store } = this.ctx;
    mouseEvents.firstPointMouseEnter = true;
    if (mode.getClosedGeometry() || this.#mouseDown) return;
    if (store.circular.canClose()) {
      const { x, y } = event.originalEvent;
      if (x && y) {
        const Y_OFFSET = 14;

        this.#tooltip.create({ label: this.getTitle(), placement: "bottom" });

        const X_OFFSET = this.#tooltip.label ? this.#tooltip.label.clientWidth / 2 : 0;
        this.#tooltip.setPosition({ x: x - X_OFFSET, y: y + Y_OFFSET });
      }
    }
  };
}
