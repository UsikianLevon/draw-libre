import type { MapLayerMouseEvent, MapMouseEvent, MapTouchEvent } from "maplibre-gl";
import type { Uuid } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";
import type { Store } from "#app/store/index";
import { ELAYERS } from "#app/utils/geo_constants";

export const isFeatureTriggered = (event: MapLayerMouseEvent, layerIds: string[]) => {
  const layers = event.target.queryRenderedFeatures(event.point, {
    layers: layerIds,
  });
  return layers.some((layer) => layerIds.includes(layer.layer.id));
};

export const queryPointId = (map: UnifiedMap, point: MapMouseEvent["point"]) => {
  const query = map.queryRenderedFeatures(point, {
    layers: [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer, ELAYERS.AuxiliaryPointLayer, ELAYERS.SinglePointLayer],
  });

  const id = query?.[0]?.properties.id;
  return id;
};

export const queryPoint = (map: UnifiedMap, point: MapMouseEvent["point"]) => {
  const query = map.queryRenderedFeatures(point, {
    layers: [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer, ELAYERS.AuxiliaryPointLayer, ELAYERS.SinglePointLayer],
  });
  return query?.[0];
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
