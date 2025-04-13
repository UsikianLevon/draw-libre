import type { MapLayerMouseEvent } from "maplibre-gl";
import type { EventsProps, Step } from "#types/index";

import { ELAYERS } from "#utils/geo_constants";
import { Spatial, uuidv4 } from "#utils/helpers";

import { FireEvents } from "../helpers";
import { CustomMap } from "#types/map";
import { togglePointCircleRadius } from "../tiles/helpers";

export const PointHelpers = {
  getMidpoint(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
    return {
      lat: (p1.lat + p2.lat) / 2,
      lng: (p1.lng + p2.lng) / 2
    };
  },

  createAuxiliaryPoint(p1: Step, p2: Step) {
    const mid = PointHelpers.getMidpoint(p1, p2);
    const step = { lat: mid.lat, lng: mid.lng, isAuxiliary: true, id: uuidv4(), };
    return step
  },

  addPointToMap(event: MapLayerMouseEvent, props: EventsProps) {
    const { store, tiles, map } = props;

    const step = { ...event.lngLat, isAuxiliary: false, id: uuidv4() };
    store.push(step);
    if (Spatial.canCloseGeometry(store, props.options)) {
      togglePointCircleRadius(map, "large");
    }
    tiles.render()
    return step;
  },
};

export const PointVisibility = {
  setFirstPointVisible(map: CustomMap) {
    map.setLayoutProperty(ELAYERS.FirstPointLayer, "visibility", "visible");
  },

  setFirstPointHidden(map: CustomMap) {
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
}

export const PointsFilter = {
  default(map: CustomMap) {
    map.setFilter(ELAYERS.PointsLayer, [
      "all",
      ["==", "$type", "Point"],
      ["==", "isFirst", false],
      ["==", "isAuxiliary", false]
    ])
  },
  closedGeometry(map: CustomMap) {
    map.setFilter(ELAYERS.PointsLayer, [
      "all",
      ["==", "$type", "Point"],
      ["==", "isAuxiliary", false]
    ])
  }
}
