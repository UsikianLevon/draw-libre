import type { GeoJSONSource, MapLayerMouseEvent, PointLike } from "maplibre-gl";

import type { LatLng } from "#app/types/index";
import { ELAYERS, ESOURCES, LINE_BASE } from "#app/utils/geo_constants";
import type { StoreChangeEvent } from "#app/store/types";
import { debounce, throttle } from "#app/utils/helpers";
import { EVENTS } from "#app/utils/constants";

import type { PointRightClickRemoveEvent, UndoEvent } from "../types";
import type { MouseEventsChangeEvent, MapMouseEvent } from "../mouse-events/types";
import { getLine } from "../renderer/geojson-builder";
import { isFeatureTriggered } from "../utils";
import type { TilesContext } from "../tiles";

const LINE_DYNAMIC_THROTTLE_TIME = 17; // 60 FPS

export class DynamicLineEvents {
  private visible: boolean;
  private firstPoint: LatLng | null = null;
  private secondPoint: LatLng | null = null;
  private lineFeature: any;
  private onMouseMoveThrottled: (event: MapLayerMouseEvent) => void;
  private onStoreEventsDebounced: (event: StoreChangeEvent) => void;

  constructor(private readonly ctx: TilesContext) {
    this.visible = true;
    this.onMouseMoveThrottled = throttle(this.onLineMove, LINE_DYNAMIC_THROTTLE_TIME);
    this.onStoreEventsDebounced = debounce(this.onStoreEventsConsumer, 10);
    this.initConsumers();
    this.initDynamicEvents();
  }

  private initConsumers() {
    this.ctx.store.addObserver(this.onStoreEventsDebounced);
    this.ctx.mouseEvents.addObserver(this.onMouseEventsConsumer);
  }

  public removeConsumers = () => {
    this.ctx.store.removeObserver(this.onStoreEventsDebounced);
    this.ctx.mouseEvents.removeObserver(this.onMouseEventsConsumer);
  };

  private onMouseEventsConsumer = (event: MouseEventsChangeEvent) => {
    const { store } = this.ctx;
    if (store.circular.isCircular()) {
      this.hide();
      return;
    }

    // this one is needed to turn off the dynamic line when the last point is clicked
    if (event.type === "lastPointMouseClick" && event.data) {
      this.hide();
      this.visible = false;
    }
    // this is needed to not trigger "show" function if the last point was clicked and we just hover a point or a line
    // doesn't matter, will rewrite this part
    if (!this.visible) return;

    // not sure about this, but looks like a good idea to hide the dynamic line on these events
    const HIDE_EVENTS = ["pointMouseEnter", "lineMouseEnter", "pointMouseDown"] as MapMouseEvent[];
    if (HIDE_EVENTS.includes(event.type) && event.data) {
      this.hide();
    }

    // if we hid the dynamic line there ^, then we obviously need to show it again
    if (event.type === "pointMouseLeave" || event.type === "lineMouseLeave") {
      const { store } = this.ctx;
      if (store.circular.isCircular()) return;
      if (event.data) {
        this.firstPoint = store.tail?.val as LatLng;
        this.secondPoint = store.tail?.val as LatLng;
        this.show();
      }
    }
  };

  private onStoreEventsConsumer = (event: StoreChangeEvent) => {
    const { store } = this.ctx;
    if (store.circular.isCircular()) {
      this.hide();

      return;
    }

    if (event.type === "STORE_CLOSE_GEOMETRY" || event.type === "STORE_CLEARED") {
      this.hide();
    } else if (event.type === "STORE_BREAK_GEOMETRY") {
      this.firstPoint = store.tail?.val as LatLng;
      this.secondPoint = event.data?.coords as LatLng;
      this.show();
      this.visible = true;
    } else if (event.type === "STORE_POINT_ADD") {
      if (store.size > 0) {
        this.firstPoint = store.tail?.val as LatLng;
        this.secondPoint = store.tail?.val as LatLng;
        this.show();
        this.visible = true;
      }
    }
  };

  private initDynamicEvents = () => {
    const { map } = this.ctx;
    map.on("click", this.onMapClick);
    map.on("mousemove", this.onMouseMoveThrottled);
    map.on(EVENTS.REMOVE_ALL, this.hide);
    map.on(EVENTS.UNDO, this.onUndoRedoClick);
    map.on(EVENTS.REDO, this.onUndoRedoClick);
    map.on(EVENTS.RIGHTCLICKREMOVE, this.onRightClickRemove);
  };

  public removeEvents = () => {
    const { map } = this.ctx;

    map.off("click", this.onMapClick);
    map.off("mousemove", this.onMouseMoveThrottled);
    map.off(EVENTS.REMOVE_ALL, this.hide);
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

  private show = () => {
    const { map, store } = this.ctx;

    if (store.size && this.firstPoint?.lat && this.firstPoint.lng && this.secondPoint?.lng && this.secondPoint?.lat) {
      const current = [this.firstPoint.lng, this.firstPoint.lat] as [number, number];
      const next = [this.secondPoint.lng, this.secondPoint.lat] as [number, number];

      this.lineFeature = getLine(current, next);

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
    const lineClick = isFeatureTriggered(event, [ELAYERS.LineLayerTransparent, ELAYERS.LineLayer]);
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
      this.firstPoint = store.tail?.val as LatLng;
      this.secondPoint = { lng: latLng.lng, lat: latLng.lat };
      this.show();
    }

    if (store.size === 0) {
      this.hide();
    }
  };

  private onRightClickRemove = (event: PointRightClickRemoveEvent) => {
    const { store } = this.ctx;
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
