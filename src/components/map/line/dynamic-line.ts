import type { GeoJSONSource, MapLayerMouseEvent, PointLike } from "maplibre-gl";

import type { EventsCtx, LatLng, Step } from "#app/types/index";
import { ELAYERS, ESOURCES, LINE_BASE } from "#app/utils/geo_constants";
import type { StoreChangeEvent } from "#app/store/types";
import { GeometryFactory, MapUtils, throttle, debounce } from "#app/utils/helpers";
import { EVENTS } from "#app/utils/constants";

import type { DrawingModeChangeEvent } from "../mode/types";
import type { MouseEventsChangeEvent } from "../mouse-events/types";
import type { PointRightClickRemoveEvent, UndoEvent } from "../types";

const LINE_DYNAMIC_THROTTLE_TIME = 10;

export class DynamicLineEvents {
  private visible: boolean;
  private firstPoint: LatLng | null = null;
  private secondPoint: LatLng | null = null;
  private lineFeature: any;
  private onMouseMoveThrottled: (event: MapLayerMouseEvent) => void;
  private onStoreDebounced: (data: StoreChangeEvent["data"]) => void;

  constructor(private readonly ctx: EventsCtx) {
    this.visible = this.ctx.options.dynamicLine;
    this.initConsumers();
    this.onMouseMoveThrottled = throttle(this.onLineMove, LINE_DYNAMIC_THROTTLE_TIME);
    this.onStoreDebounced = debounce(this.evaluateVisibility, 10);
  }

  private initConsumers() {
    this.ctx.store.addObserver(this.onStoreEventsConsumer);
    this.ctx.mode.addObserver(this.onMapModeConsumer);
    this.ctx.mouseEvents.addObserver(this.onMouseEventsConsumer);
  }

  removeConsumers = () => {
    this.ctx.store.removeObserver(this.onStoreEventsConsumer);
    this.ctx.mode.removeObserver(this.onMapModeConsumer);
    this.ctx.mouseEvents.removeObserver(this.onMouseEventsConsumer);
  };

  private onMouseEventsConsumer = (event: MouseEventsChangeEvent) => {
    const { mode } = this.ctx;
    if (mode.getClosedGeometry()) return;

    if (event.type === "lastPointMouseClick" && event.data) {
      this.hide();
      this.visible = false;
    } else if (event.type === "lastPointMouseClick" && !event.data) {
      this.visible = true;
    }
    if (!this.visible) return;

    // hide the line if a point or a line is hovered
    if (event.type === "pointMouseEnter" || event.type === "lineMouseEnter") {
      if (event.data) {
        this.hide();
      }
    }
    if (event.type === "pointMouseLeave" || event.type === "lineMouseLeave") {
      const { store } = this.ctx;
      if (event.data && !store.circular.isCircular()) {
        this.firstPoint = store.tail?.val as LatLng;
        this.secondPoint = store.tail?.val as LatLng;
        this.show();
      }
    }
  };

  private evaluateVisibility = (data: StoreChangeEvent["data"]) => {
    const { store } = this.ctx;

    if (store.circular.isCircular()) {
      this.hide();
    } else {
      this.firstPoint = store.tail?.val as Step;
      this.show();
    }
  };

  private onStoreEventsConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_MUTATED") {
      if (!event.data?.size) {
        this.hide();
      } else {
        this.onStoreDebounced(event.data);
      }
    }
  };

  private onMapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { store } = this.ctx;

    const isClosed = event.data;
    if (event.type === "CLOSED_GEOMETRY_CHANGED") {
      if (isClosed) {
        this.hide();
      }

      if (!store.circular.isCircular() && store?.tail?.val) {
        this.firstPoint = store?.tail?.val;
        this.show();
      }
    }
  };

  public initDynamicEvents = () => {
    const { map } = this.ctx;
    map.on("click", this.onMapClick);
    map.on("mousemove", this.onMouseMoveThrottled);
    map.on(EVENTS.REMOVEALL, this.hide);
    map.on(EVENTS.UNDO, this.onUndoRedoClick);
    map.on(EVENTS.REDO, this.onUndoRedoClick);
    map.on(EVENTS.RIGHTCLICKREMOVE, this.onRightClickRemove);
  };

  public removeEvents = () => {
    const { map } = this.ctx;

    map.off("click", this.onMapClick);
    map.off("mousemove", this.onMouseMoveThrottled);
    map.off(EVENTS.REMOVEALL, this.hide);
    map.off(EVENTS.UNDO, this.onUndoRedoClick);
    map.off(EVENTS.REDO, this.onUndoRedoClick);
    map.off(EVENTS.RIGHTCLICKREMOVE, this.onRightClickRemove);
  };

  public hide = () => {
    const { map } = this.ctx;

    this.firstPoint = null;
    this.secondPoint = null;
    this.lineFeature = null;
    map.off("mousemove", this.onMouseMoveThrottled);

    const lineSource = map.getSource(ESOURCES.LineDynamicSource) as GeoJSONSource;
    if (lineSource) {
      lineSource.setData(LINE_BASE as GeoJSON.FeatureCollection);
    }
    if (map.getLayer(ELAYERS.LineDynamicLayer)) {
      map.setLayoutProperty(ELAYERS.LineDynamicLayer, "visibility", "none");
    }
  };

  public show = () => {
    const { map, store } = this.ctx;

    if (store.size && this.firstPoint?.lat && this.firstPoint.lng && this.secondPoint?.lng && this.secondPoint?.lat) {
      const current = [this.firstPoint.lng, this.firstPoint.lat] as [number, number];
      const next = [this.secondPoint.lng, this.secondPoint.lat] as [number, number];

      this.lineFeature = GeometryFactory.getLine(current, next);

      map.setLayoutProperty(ELAYERS.LineDynamicLayer, "visibility", "visible");
      if (this.secondPoint) {
        this.renderLineOnMouseMove({ lng: this.secondPoint?.lng, lat: this.secondPoint?.lat });
      }
    }
    map.on("mousemove", this.onMouseMoveThrottled);
  };

  private renderLineOnMouseMove = (newCoord: LatLng) => {
    if (!this.lineFeature) return;
    const { map } = this.ctx;

    this.lineFeature.features[0].geometry.coordinates[1] = [newCoord.lng, newCoord.lat];
    const lineSource = map.getSource(ESOURCES.LineDynamicSource) as GeoJSONSource;
    if (lineSource) {
      lineSource.setData(this.lineFeature);
    }
  };

  private onLineMove = (event: MapLayerMouseEvent) => {
    this.renderLineOnMouseMove(event.lngLat);
  };

  private onMapClick = (event: MapLayerMouseEvent) => {
    const { mode } = this.ctx;
    const lineClick = MapUtils.isFeatureTriggered(event, [ELAYERS.LineLayerTransparent, ELAYERS.LineLayer]);
    if (lineClick && mode.getBreak()) {
      this.secondPoint = { lng: event.lngLat.lng, lat: event.lngLat.lat };
    }

    if (lineClick) return;
    this.hide();
  };

  private onUndoRedoClick = (event: UndoEvent) => {
    const { store } = this.ctx;

    if (!store.circular.isCircular()) {
      const latLng = event.target.unproject({ x: event.originalEvent.x, y: event.originalEvent.y } as PointLike);
      this.secondPoint = { lng: latLng.lng, lat: latLng.lat };
      this.firstPoint = store.tail?.val as LatLng;
      this.show();
    }

    if (store.size === 0) {
      this.hide();
    }
  };

  private onRightClickRemove = (event: PointRightClickRemoveEvent) => {
    const { store, mode } = this.ctx;
    if (!store.circular.isCircular()) {
      this.secondPoint = { lng: event.coordinates.lng, lat: event.coordinates.lat };
      this.firstPoint = store.tail?.val as LatLng;
      this.show();
    }
    if (store.size === 0) {
      this.hide();
    }
  };
}
