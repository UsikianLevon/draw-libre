import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";

import { ELAYERS, ESOURCES } from "#app/utils/geo_constants";
import { throttle } from "#app/utils/helpers";

import { FireEvents } from "../fire-events";
import { PointVisibility } from "../points/helpers";
import { checkIfPointClicked, insertStepIfOnLine, updateUIAfterInsert } from "./utils";
import { isFeatureTriggered } from "../utils";
import { TilesContext } from "#components/map/tiles";
import { DrawingModeChangeEvent } from "../mode/types";

export const LINE_TRANSPARENT_THROTTLE_TIME = 17;

export class TransparentLineEvents {
  private eventsInited = false;
  private isThrottled: boolean;
  private lastEvent: MapLayerMouseEvent | null;

  constructor(private readonly ctx: TilesContext) {
    this.isThrottled = false;
    this.lastEvent = null;
    this.initConsumers();
  }

  private initConsumers = () => {
    this.ctx.mode.addObserver(this.mapModeConsumer);
  };

  public removeConsumers = () => {
    this.ctx.mode.removeObserver(this.mapModeConsumer);
  };

  private mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { type, data } = event;

    if (type === "MODE_CHANGED" && !data) {
      if (this.eventsInited) {
        this.removeEvents();
      }
    } else if (type === "MODE_CHANGED" && data) {
      if (!this.eventsInited) {
        this.initEvents();
      }
    }
  };

  initEvents() {
    this.ctx.map.on("click", ELAYERS.LineLayerTransparent, this.onLineClick);
    this.ctx.map.on("mousemove", ELAYERS.LineLayerTransparent, this.onLineMove);
    this.ctx.map.on("mouseenter", ELAYERS.LineLayerTransparent, this.onLineEnter);
    this.ctx.map.on("mouseleave", ELAYERS.LineLayerTransparent, this.onLineLeave);
    this.eventsInited = true;
  }

  removeEvents() {
    this.ctx.map.off("click", ELAYERS.LineLayerTransparent, this.onLineClick);
    this.ctx.map.off("mousemove", ELAYERS.LineLayerTransparent, this.onLineMove);
    this.ctx.map.off("mouseenter", ELAYERS.LineLayerTransparent, this.onLineEnter);
    this.ctx.map.off("mouseleave", ELAYERS.LineLayerTransparent, this.onLineLeave);
    this.eventsInited = false;
  }

  private onLineClick = (event: MapLayerMouseEvent) => {
    const { store, map, mode } = this.ctx;
    if (checkIfPointClicked(event)) return;
    const step = insertStepIfOnLine(event, store);
    if (step) {
      updateUIAfterInsert(event, this.ctx);
      FireEvents.addPoint({ ...step, total: store.size }, map, mode);
    }
  };

  private processMouseMove = (event: MapLayerMouseEvent) => {
    PointVisibility.setSinglePointVisible(event);
    if (event.target.getLayer(ELAYERS.SinglePointLayer)) {
      const map = event.target;
      const pointSource = map.getSource(ESOURCES.SinglePointSource) as GeoJSONSource;
      if (pointSource) {
        pointSource.setData({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [event.lngLat.lng, event.lngLat.lat],
          },
          properties: {},
        });
      }
    }
  };

  private onLineMove = throttle((event: MapLayerMouseEvent) => {
    if (isFeatureTriggered(event, [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer])) return;
    if (this.ctx.mouseEvents.pointMouseDown || this.ctx.mouseEvents.pointMouseEnter) return;

    this.lastEvent = event;

    if (this.isThrottled) return;

    this.isThrottled = true;
    requestAnimationFrame(() => {
      if (!this.lastEvent) return;
      this.processMouseMove(this.lastEvent);
      this.isThrottled = false;
    });
  }, LINE_TRANSPARENT_THROTTLE_TIME);

  private onLineEnter = (event: MapLayerMouseEvent) => {
    if (this.ctx.mouseEvents.pointMouseDown || this.ctx.mouseEvents.pointMouseEnter) return;
    if (isFeatureTriggered(event, [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer])) return;

    this.ctx.mouseEvents.lineMouseEnter = true;
    PointVisibility.setSinglePointVisible(event);
  };

  private onLineLeave = (event: MapLayerMouseEvent) => {
    if (this.ctx.mouseEvents.pointMouseDown || this.ctx.mouseEvents.pointMouseEnter) return;

    this.ctx.mouseEvents.lineMouseLeave = true;
    PointVisibility.setSinglePointHidden(event);
  };
}
