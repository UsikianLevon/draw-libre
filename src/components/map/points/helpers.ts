import type { MapLayerMouseEvent } from "maplibre-gl";
import type { Step } from "#app/types/index";

import { ELAYERS, POINTS_FILTER } from "#app/utils/geo_constants";
import { uuidv4 } from "#app/utils/helpers";

import type { EngineMap } from "#app/types/engine";

export const PointHelpers = {
  getMidpoint(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
    return {
      lat: (p1.lat + p2.lat) / 2,
      lng: (p1.lng + p2.lng) / 2,
    };
  },

  createAuxiliaryPoint(p1: Step, p2: Step) {
    const mid = PointHelpers.getMidpoint(p1, p2);
    const step = { lat: mid.lat, lng: mid.lng, isAuxiliary: true, id: uuidv4() };
    return step;
  },
};

const FIRST_POINT_LAYERS = [ELAYERS.FirstPointLayer, ELAYERS.FirstPointHitLayer, ELAYERS.FirstPointHaloLayer];
const POINT_LAYERS = [ELAYERS.PointsLayer, ELAYERS.PointsHitLayer, ELAYERS.PointsHaloLayer];

const SINGLE_POINT_HIDE_DELAY = 33;

let singlePointHideTimer: ReturnType<typeof setTimeout> | null = null;

const cancelSinglePointHiding = () => {
  if (singlePointHideTimer !== null) {
    clearTimeout(singlePointHideTimer);
    singlePointHideTimer = null;
  }
};

export const PointVisibility = {
  cancelSinglePointHiding,

  setFirstPointVisible(map: EngineMap) {
    for (const layer of FIRST_POINT_LAYERS) {
      map.setLayoutProperty(layer, "visibility", "visible");
    }
  },

  setFirstPointHidden(map: EngineMap) {
    for (const layer of FIRST_POINT_LAYERS) {
      map.setLayoutProperty(layer, "visibility", "none");
    }
  },

  setSinglePointVisible(event: MapLayerMouseEvent) {
    cancelSinglePointHiding();
    event.target.setLayoutProperty(ELAYERS.SinglePointLayer, "visibility", "visible");
  },

  setSinglePointHidden(event: MapLayerMouseEvent) {
    const map = event.target;
    cancelSinglePointHiding();
    singlePointHideTimer = setTimeout(() => {
      singlePointHideTimer = null;
      map.setLayoutProperty(ELAYERS.SinglePointLayer, "visibility", "none");
    }, SINGLE_POINT_HIDE_DELAY);
  },
};

export const PointsFilter = {
  default(map: EngineMap) {
    for (const layer of POINT_LAYERS) {
      map.setFilter(layer, POINTS_FILTER.points);
    }
  },
  closedGeometry(map: EngineMap) {
    for (const layer of POINT_LAYERS) {
      map.setFilter(layer, POINTS_FILTER.pointsWhenClosed);
    }
  },
};
