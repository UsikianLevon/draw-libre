import type { MapLayerMouseEvent } from "maplibre-gl";
import type { Step } from "#app/types/index";

import { ELAYERS } from "#app/utils/geo_constants";
import { uuidv4 } from "#app/utils/helpers";

import type { UnifiedMap } from "#app/types/map";

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

export const PointVisibility = {
  setFirstPointVisible(map: UnifiedMap) {
    map.setLayoutProperty(ELAYERS.FirstPointLayer, "visibility", "visible");
  },

  setFirstPointHidden(map: UnifiedMap) {
    map.setLayoutProperty(ELAYERS.FirstPointLayer, "visibility", "none");
  },

  setSinglePointVisible(event: MapLayerMouseEvent) {
    const map = event.target;
    map.setLayoutProperty(ELAYERS.SinglePointLayer, "visibility", "visible");
  },

  setSinglePointHidden(event: MapLayerMouseEvent) {
    const map = event.target;
    setTimeout(() => {
      map.setLayoutProperty(ELAYERS.SinglePointLayer, "visibility", "none");
    }, 33);
  },
};

export const PointsFilter = {
  default(map: UnifiedMap) {
    map.setFilter(ELAYERS.PointsLayer, [
      "all",
      ["==", "$type", "Point"],
      ["==", "isFirst", false],
      ["==", "isAuxiliary", false],
    ]);
  },
  closedGeometry(map: UnifiedMap) {
    map.setFilter(ELAYERS.PointsLayer, ["all", ["==", "$type", "Point"], ["==", "isAuxiliary", false]]);
  },
};
