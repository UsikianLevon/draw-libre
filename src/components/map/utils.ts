import type { MapLayerMouseEvent, MapMouseEvent, MapTouchEvent } from "maplibre-gl";
import type { Uuid } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";
import type { Store } from "#app/store/index";
import { ELAYERS } from "#app/utils/geo_constants";
import { nearestVertexPx } from "./line/projection";

export const POINT_HIT_LAYERS = [ELAYERS.PointsHitLayer, ELAYERS.FirstPointHitLayer, ELAYERS.AuxiliaryPointHitLayer];

export const isFeatureTriggered = (event: MapLayerMouseEvent, layerIds: string[]) => {
  const layers = event.target.queryRenderedFeatures(event.point, {
    layers: layerIds,
  });
  return layers.some((layer) => layerIds.includes(layer.layer.id));
};

export const queryPointId = (map: UnifiedMap, point: MapMouseEvent["point"]) => {
  const id = queryPoint(map, point)?.properties.id;
  return id;
};

export const queryPoint = (map: UnifiedMap, point: MapMouseEvent["point"]) => {
  const features = map.queryRenderedFeatures(point, {
    layers: POINT_HIT_LAYERS,
  });
  if (features.length < 2) return features[0];

  // rendered features come ordered by layer, not by distance, and keep coordinates of the original world copy
  const cursorLng = map.unproject(point).lng;
  const pixels = features.map((feature) => {
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
    return map.project({ lng: lng + 360 * Math.round((cursorLng - lng) / 360), lat });
  });

  const nearest = nearestVertexPx(pixels, point);
  return nearest ? features[nearest.index] : undefined;
};

export const getGeometryIndex = (store: Store, id: Uuid) => {
  let current = store.head;
  let idx = 0;
  const visitedNodes = new Set();
  while (current !== null) {
    if (visitedNodes.has(current.val?.id)) {
      break;
    }
    if (current.val?.id === id) {
      return idx;
    }

    visitedNodes.add(current.val?.id);
    idx++;
    current = current.next;
  }
  return -1;
};

export function isRightClick(event: MapLayerMouseEvent | MapTouchEvent): boolean {
  return (event.originalEvent as MouseEvent).button === 2;
}
