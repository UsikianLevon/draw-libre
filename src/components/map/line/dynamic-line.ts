import type { GeoJSONSource, MapLayerMouseEvent, PointLike } from "maplibre-gl";

import type { EventsProps, LatLng } from "#types/index";
import { ELAYERS, ESOURCES, LINE_BASE } from "#utils/geo_constants";
import { StoreChangeEvent } from "#store/types";
import { debounce, GeometryFactory, MapUtils, Spatial, throttle } from "#utils/helpers";
import { EVENTS } from "#utils/constants";

import { DrawingModeChangeEvent } from "../mode/types";
import { MouseEventsChangeEvent } from "../mouse-events/types";
import { PointDoubleClickEvent, UndoEvent } from "../types";

const LINE_DYNAMIC_THROTTLE_TIME = 10;

export class DynamicLineEvents {
  #props: EventsProps;
  #visible: boolean;
  #firstPoint: LatLng | null;
  #secondPoint: LatLng | null;
  #lineFeature: any;
  #throttledOnLineMove: (event: MapLayerMouseEvent) => void;

  constructor(props: EventsProps) {
    this.#props = props;
    this.#visible = props.options.dynamicLine;
    this.#firstPoint = null;
    this.#secondPoint = null;
    this.#initConsumers();
    this.#throttledOnLineMove = throttle(this.#onLineMove, LINE_DYNAMIC_THROTTLE_TIME);
  }

  #initConsumers() {
    this.#props.store.addObserver(this.#storeEventsConsumer);
    this.#props.mode.addObserver(this.#mapModeConsumer);
    this.#props.mouseEvents.addObserver(this.#mouseEventsConsumer);
  }

  removeLine = () => {
    this.hideDynamicLine();
  };

  removeConsumers = () => {
    this.#props.store.removeObserver(this.#storeEventsConsumer);
    this.#props.mode.removeObserver(this.#mapModeConsumer);
    this.#props.mouseEvents.removeObserver(this.#mouseEventsConsumer);
  };

  #mouseEventsConsumer = (event: MouseEventsChangeEvent) => {
    const { mode } = this.#props;
    if (mode.getClosedGeometry()) return;

    if (event.type === "lastPointMouseClick" && event.data) {
      this.hideDynamicLine();
      this.#visible = false;
    } else if (event.type === "lastPointMouseClick" && !event.data) {
      this.#visible = true;
    }
    if (!this.#visible) return;
    // hide the line if a point or a line is hovered
    if ((event.type === "pointMouseEnter" || event.type === "lineMouseEnter") && event.data) {
      this.hideDynamicLine();
    }
    if ((event.type === "pointMouseLeave" || event.type === "lineMouseLeave") && event.data) {
      const { store } = this.#props;
      this.#firstPoint = store.tail?.val as LatLng;
      this.#secondPoint = store.tail?.val as LatLng;
      this.showDynamicLine();
    }
  };

  #storeEventsConsumer = (event: StoreChangeEvent) => {
    const { store } = this.#props;
    switch (event.type) {
      case "STORE_CHANGED":
        console.log(store, store.tail?.next === store.head);
        const debouncedDynamicLine = debounce(() => {
          if (event.data.tail?.val && store.tail?.next !== store.head) {
            this.#firstPoint = event.data.tail?.val;
            this.showDynamicLine();
          }
        }, 10);
        debouncedDynamicLine();
        break;
      default:
        break;
    }
  };

  #mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { store } = this.#props;
    if (event.type === "CLOSED_GEOMETRY_CHANGED") {
      if (event.data) {
        this.hideDynamicLine();
      }

      if (!event.data && store?.tail?.val) {
        this.#firstPoint = store?.tail?.val;
        this.showDynamicLine();
      }
    }
  };

  initDynamicEvents = () => {
    const { map } = this.#props;

    map.on("click", this.#onMapClick);
    map.on("mousemove", this.#throttledOnLineMove);
    map.on(EVENTS.REMOVEALL, this.hideDynamicLine);
    map.on(EVENTS.UNDO, this.#onUndoClick);
    map.on(EVENTS.DOUBLECLICK, this.#onDoubleClick);
  };

  removeEvents = () => {
    const { map } = this.#props;

    map.off("click", this.#onMapClick);
    map.off("mousemove", this.#throttledOnLineMove);
    map.off(EVENTS.REMOVEALL, this.hideDynamicLine);
    map.off(EVENTS.UNDO, this.#onUndoClick);
    map.off(EVENTS.DOUBLECLICK, this.#onDoubleClick);
  };

  hideDynamicLine = () => {
    const { map, } = this.#props;

    this.#firstPoint = null;
    this.#secondPoint = null;
    this.#lineFeature = null;
    map.off("mousemove", this.#throttledOnLineMove);

    const lineSource = map.getSource(ESOURCES.LineDynamicSource) as GeoJSONSource;
    if (lineSource) {
      lineSource.setData(LINE_BASE as GeoJSON.FeatureCollection);
    }
    map.setLayoutProperty(ELAYERS.LineDynamicLayer, "visibility", "none");
  };

  showDynamicLine = () => {
    const { map } = this.#props;

    const current = [this.#firstPoint?.lng, this.#firstPoint?.lat] as [number, number];
    const next = [this.#secondPoint?.lng, this.#secondPoint?.lat] as [number, number];

    this.#lineFeature = GeometryFactory.getLine(current, next);

    map.setLayoutProperty(ELAYERS.LineDynamicLayer, "visibility", "visible");
    if (this.#secondPoint) {
      this.#renderLineOnMouseMove({ lng: this.#secondPoint?.lng, lat: this.#secondPoint?.lat });
    }
    map.on("mousemove", this.#throttledOnLineMove);
  };

  #renderLineOnMouseMove = (newCoord: LatLng) => {
    if (!this.#lineFeature) return;
    const { map, } = this.#props;

    this.#lineFeature.features[0].geometry.coordinates[1] = [newCoord.lng, newCoord.lat];
    const lineSource = map.getSource(ESOURCES.LineDynamicSource) as GeoJSONSource;
    if (lineSource) {
      lineSource.setData(this.#lineFeature);
    }
  };

  #onLineMove = (event: MapLayerMouseEvent) => {
    this.#renderLineOnMouseMove(event.lngLat);
  };

  #onMapClick = (event: MapLayerMouseEvent) => {
    const { mode } = this.#props;
    const lineClick = MapUtils.isFeatureTriggered(event, [ELAYERS.LineLayerTransparent, ELAYERS.LineLayer]);
    if (lineClick && mode.getBreak()) {
      this.#secondPoint = { lng: event.lngLat.lng, lat: event.lngLat.lat };
    }

    if (lineClick) return;

    this.hideDynamicLine();
  };

  #onUndoClick = (event: UndoEvent) => {
    const { store, mode } = this.#props;
    if (!mode.getClosedGeometry()) {
      const latLng = event.target.unproject({ x: event.originalEvent.x, y: event.originalEvent.y } as PointLike);
      this.#secondPoint = { lng: latLng.lng, lat: latLng.lat };
      this.#firstPoint = store.tail?.val as LatLng;
      this.showDynamicLine();
    }
    if (store.size === 0) {
      this.hideDynamicLine();
    }
  };

  #onDoubleClick = (event: PointDoubleClickEvent) => {
    const { store, mode } = this.#props;
    if (!mode.getClosedGeometry()) {
      this.#secondPoint = { lng: event.coordinates.lng, lat: event.coordinates.lat };
      this.#firstPoint = store.tail?.val as LatLng;
      this.showDynamicLine();
    }
    if (store.size === 0) {
      this.hideDynamicLine();
    }
  };
}
