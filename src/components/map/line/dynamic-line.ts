import type { GeoJSONSource, MapLayerMouseEvent, PointLike } from "maplibre-gl";

import { DOM } from "#app/dom";
import type { LatLng } from "#app/types/index";
import { ELAYERS, ESOURCES, LINE_BASE } from "#app/utils/geo_constants";
import type { StoreChangeEvent } from "#app/store/types";
import { coalesceToFrame, debounce, type Debounced } from "#app/utils/helpers";
import { EVENTS } from "#app/utils/constants";

import type { MouseEventsChangeEvent, MapMouseEvent } from "../mouse-events/types";
import { getLine } from "../renderer/geojson-builder";
import { isFeatureTriggered } from "../utils";
import type { TilesContext } from "../tiles";
import { hideDynamicLine } from "./utils";
import { DrawingModeChangeEvent } from "../mode/types";

export class DynamicLineEvents {
  private visible: boolean;
  private firstPoint: LatLng | null = null;
  private secondPoint: LatLng | null = null;
  private pointer: LatLng | null = null;
  private lineFeature: any;
  private onStoreEventsDebounced: Debounced<(event: StoreChangeEvent) => void>;
  private renderFreeEnd = coalesceToFrame((event: MapLayerMouseEvent) => {
    this.renderLineOnMouseMove(event.lngLat);
  });

  constructor(private readonly ctx: TilesContext) {
    this.visible = true;
    this.onStoreEventsDebounced = debounce(this.onStoreEventsConsumer, 10);
    this.initConsumers();
    this.initDynamicEvents();
  }

  private initConsumers() {
    this.ctx.store.addObserver(this.onStoreEventsDebounced);
    this.ctx.mouseEvents.addObserver(this.onMouseEventsConsumer);
    this.ctx.mode.addObserver(this.mapModeConsumer);
  }

  public removeConsumers = () => {
    this.ctx.store.removeObserver(this.onStoreEventsDebounced);
    this.onStoreEventsDebounced.cancel();
    this.ctx.mouseEvents.removeObserver(this.onMouseEventsConsumer);
    this.ctx.mode.removeObserver(this.mapModeConsumer);
  };

  private mapModeConsumer = (event: DrawingModeChangeEvent) => {
    if (event.type === "MODE_CHANGED" && !event.data) {
      this.hide();
    }
  };

  private onMouseEventsConsumer = (event: MouseEventsChangeEvent) => {
    const { store } = this.ctx;
    if (this.ctx.mode.getMode() === null) return;
    if (store.circular.isCircular()) {
      this.hide();
      return;
    }

    // the last point click always hides the dynamic line
    if (event.type === "lastPointMouseClick" && event.data) {
      this.hide();
      this.visible = false;
    }
    // avoids calling show right after the last point click while just hovering a point or line
    // TODO rewrite this condition
    if (!this.visible) return;

    // hides the dynamic line on these events, reason unclear
    const HIDE_EVENTS = ["pointMouseEnter", "lineMouseEnter", "pointMouseDown"] as MapMouseEvent[];
    if (HIDE_EVENTS.includes(event.type) && event.data) {
      this.hide();
    }

    // shows the dynamic line back when it was hidden by the block above
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
    if (this.ctx.mode.getMode() === null) return;
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
        this.secondPoint = this.freeEnd();
        this.show();
        this.visible = true;
      }
    } else if (event.type === "STORE_MUTATED") {
      if (this.ctx.mouseEvents.pointMouseDown) return;
      if (store.size === 0) return;
      this.firstPoint = store.tail?.val as LatLng;
      if (this.ctx.mouseEvents.pointMouseEnter) return;
      this.secondPoint = this.freeEnd();
      this.show();
      this.visible = true;
    }
  };

  private initDynamicEvents = () => {
    const { map } = this.ctx;
    map.on("click", this.onMapClick);
    map.on("mousemove", this.renderFreeEnd);
    map.on(EVENTS.REMOVE_ALL, this.hide);
    map.on(EVENTS.UNDO, this.onUndoRedoClick);
    map.on(EVENTS.REDO, this.onUndoRedoClick);
    map.on(EVENTS.POINT_REMOVE, this.onPointRemove);
    DOM.addEventListener(map.getContainer(), "pointermove", this.onPointerMove);
  };

  public removeEvents = () => {
    const { map } = this.ctx;

    map.off("click", this.onMapClick);
    map.off("mousemove", this.renderFreeEnd);
    this.renderFreeEnd.cancel();
    map.off(EVENTS.REMOVE_ALL, this.hide);
    map.off(EVENTS.UNDO, this.onUndoRedoClick);
    map.off(EVENTS.REDO, this.onUndoRedoClick);
    map.off(EVENTS.POINT_REMOVE, this.onPointRemove);
    DOM.removeEventListener(map.getContainer(), "pointermove", this.onPointerMove);
  };

  public hide = () => {
    const { map } = this.ctx;

    this.firstPoint = null;
    this.secondPoint = null;
    this.lineFeature = null;
    map.off("mousemove", this.renderFreeEnd);
    this.renderFreeEnd.cancel();

    hideDynamicLine(map);
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
    map.on("mousemove", this.renderFreeEnd);
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

  private onPointerMove = (event: Event) => {
    const { map } = this.ctx;
    const { clientX, clientY } = event as PointerEvent;
    const box = map.getContainer().getBoundingClientRect();
    const latLng = map.unproject([clientX - box.left, clientY - box.top] as PointLike);

    this.pointer = { lng: latLng.lng, lat: latLng.lat };
  };

  private freeEnd = (): LatLng => {
    const { store } = this.ctx;
    return this.pointer ?? (store.tail?.val as LatLng);
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

  private onUndoRedoClick = () => {
    const { store } = this.ctx;

    if (!store.circular.isCircular()) {
      this.firstPoint = store.tail?.val as LatLng;
      this.secondPoint = this.freeEnd();
      this.show();
    }

    if (store.size === 0) {
      this.hide();
    }
  };

  private onPointRemove = () => {
    const { store } = this.ctx;
    if (!store.circular.isCircular()) {
      this.firstPoint = store.tail?.val as LatLng;
      this.secondPoint = this.freeEnd();
      this.show();
    }
    if (store.size === 0) {
      this.hide();
    }
  };
}
