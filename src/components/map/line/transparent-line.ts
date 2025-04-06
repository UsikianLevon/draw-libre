import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";

import type { EventsProps } from "#types/index";
import { ELAYERS, ESOURCES } from "#utils/geo_constants";
import { MapUtils, throttle } from "#utils/helpers";
import { FireEvents } from "../helpers";
import { PointHelpers } from "../points/helpers";
import { checkIfPointClicked, insertStepIfOnLine, updateUIAfterInsert } from "./utils";

export const LINE_TRANSPARENT_THROTTLE_TIME = 22;

export class TransparentLineEvents {
  props: EventsProps;
  #isThrottled: boolean;
  #lastEvent: MapLayerMouseEvent | null;

  constructor(props: EventsProps) {
    this.props = props;
    this.#isThrottled = false;
    this.#lastEvent = null;
  }

  initEvents() {
    const { map } = this.props;

    map.on("click", ELAYERS.LineLayerTransparent, this.#onLineAdd);
    map.on("mousemove", ELAYERS.LineLayerTransparent, this.#onLineMove);
    map.on("mouseenter", ELAYERS.LineLayerTransparent, this.#onLineEnter);
    map.on("mouseleave", ELAYERS.LineLayerTransparent, this.#onLineLeave);
  }

  removeEvents() {
    const { map } = this.props;
    map.off("click", ELAYERS.LineLayerTransparent, this.#onLineAdd);
    map.off("mousemove", ELAYERS.LineLayerTransparent, this.#onLineMove);
    map.off("mouseenter", ELAYERS.LineLayerTransparent, this.#onLineEnter);
    map.off("mouseleave", ELAYERS.LineLayerTransparent, this.#onLineLeave);
  }

  #onLineAdd = (event: MapLayerMouseEvent) => {
    const { store, map, mode } = this.props;
    if (checkIfPointClicked(event)) return;
    const step = insertStepIfOnLine(event, store);
    if (step) {
      FireEvents.addPoint({ ...step, total: store.size }, map, mode);
      updateUIAfterInsert(event, this.props);
    }
  };

  #processMouseMove = (event: MapLayerMouseEvent) => {
    PointHelpers.setSinglePointVisible(event);
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

  #onLineMove = throttle((event: MapLayerMouseEvent) => {
    if (MapUtils.isFeatureTriggered(event, [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer])) return;

    const { mouseEvents } = this.props;
    if (mouseEvents.pointMouseDown || mouseEvents.pointMouseEnter) return;

    this.#lastEvent = event;

    if (this.#isThrottled) return;

    this.#isThrottled = true;
    requestAnimationFrame(() => {
      if (!this.#lastEvent) return;
      this.#processMouseMove(this.#lastEvent);
      this.#isThrottled = false;
    });
  }, LINE_TRANSPARENT_THROTTLE_TIME);

  #onLineEnter = (event: MapLayerMouseEvent) => {
    const { mouseEvents } = this.props;
    if (mouseEvents.pointMouseDown || mouseEvents.pointMouseEnter) return;
    if (MapUtils.isFeatureTriggered(event, [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer])) return;

    mouseEvents.lineMouseEnter = true;
    PointHelpers.setSinglePointVisible(event);
  };

  #onLineLeave = (event: MapLayerMouseEvent) => {
    const { mouseEvents } = this.props;
    if (mouseEvents.pointMouseDown || mouseEvents.pointMouseEnter) return;

    mouseEvents.lineMouseLeave = true;
    PointHelpers.setSinglePointHidden(event);
  };
}
