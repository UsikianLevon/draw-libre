import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";

import { ELAYERS, ESOURCES } from "#app/utils/geo_constants";
import { throttle } from "#app/utils/helpers";

import { FireEvents } from "../fire-events";
import { PointVisibility } from "../points/helpers";
import { checkIfPointClicked, insertStepIfOnLine, updateUIAfterInsert } from "./utils";
import { TilesContext } from "#components/map/tiles";
import { DrawingModeChangeEvent } from "../mode/types";

export const LINE_TRANSPARENT_THROTTLE_TIME = 17;

export class TransparentLineEvents {
  private eventsInited = false;
  private pointerOnLine = false;
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
    this.pointerOnLine = false;
    this.eventsInited = false;
  }

  private onLineClick = (event: MapLayerMouseEvent) => {
    const { store, map, mode } = this.ctx;
    if (checkIfPointClicked(event)) return;
    const step = insertStepIfOnLine(event, this.ctx);
    if (step) {
      updateUIAfterInsert(event, this.ctx);
      FireEvents.addPoint({ ...step, total: store.size }, map, mode);
    }
  };

  private hitClearOfVertices = (event: MapLayerMouseEvent) => {
    const hit = this.ctx.projection.hit(event.point);
    if (!hit || hit.vertexDistance < this.ctx.options.interaction.pointHitRadius) return null;

    return hit;
  };

  private processMouseMove = (event: MapLayerMouseEvent) => {
    const hit = this.hitClearOfVertices(event);

    if (!hit) {
      PointVisibility.setSinglePointHidden(event);
      return;
    }

    PointVisibility.setSinglePointVisible(event);
    if (event.target.getLayer(ELAYERS.SinglePointLayer)) {
      const map = event.target;
      const pointSource = map.getSource(ESOURCES.SinglePointSource) as GeoJSONSource;
      if (pointSource) {
        pointSource.setData({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [hit.projected.lng, hit.projected.lat],
          },
          properties: {},
        });
      }
    }
  };

  private onLineMove = throttle((event: MapLayerMouseEvent) => {
    if (this.ctx.mouseEvents.pointMouseDown || this.ctx.mouseEvents.pointMouseEnter) return;

    this.lastEvent = event;

    if (this.isThrottled) return;

    this.isThrottled = true;
    requestAnimationFrame(() => {
      this.isThrottled = false;
      // a frame queued before mouseleave carries a position that is already off the line
      if (!this.pointerOnLine || !this.lastEvent) return;
      this.processMouseMove(this.lastEvent);
    });
  }, LINE_TRANSPARENT_THROTTLE_TIME);

  private onLineEnter = (event: MapLayerMouseEvent) => {
    this.pointerOnLine = true;
    if (this.ctx.mouseEvents.pointMouseDown || this.ctx.mouseEvents.pointMouseEnter) return;
    if (!this.hitClearOfVertices(event)) return;

    this.ctx.mouseEvents.lineMouseEnter = true;
    PointVisibility.setSinglePointVisible(event);
  };

  private onLineLeave = (event: MapLayerMouseEvent) => {
    this.pointerOnLine = false;
    if (this.ctx.mouseEvents.pointMouseDown || this.ctx.mouseEvents.pointMouseEnter) return;

    this.ctx.mouseEvents.lineMouseLeave = true;
    PointVisibility.setSinglePointHidden(event);
  };
}
