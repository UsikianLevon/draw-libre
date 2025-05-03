import type { MapLayerMouseEvent } from "maplibre-gl";
import type { EventsProps, Step } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";

import type { Store } from "#app/store/index";
import { ELAYERS } from "#app/utils/geo_constants";
import { MapUtils, Spatial, uuidv4 } from "#app/utils/helpers";
import { PointVisibility } from "../points/helpers";

export const isOnLine = (event: MapLayerMouseEvent, store: Store) => {
  let current = store.head;
  const visited = new Set();

  while (current !== null) {
    if (visited.has(current)) break;
    if (current?.next?.val && current?.val) {
      const map = event.target as UnifiedMap;
      const aPixel = MapUtils.getPixelCoordinates(map, current.val);
      const bPixel = MapUtils.getPixelCoordinates(map, current.next.val);
      const eventPixel = MapUtils.getPixelCoordinates(map, event.lngLat);
      if (Spatial.checkIfPointIsOnLine(aPixel, bPixel, eventPixel)) {
        return current;
      }
    }
    visited.add(current);
    current = current.next;
  }
  return null;
};

export const insertStepIfOnLine = (event: MapLayerMouseEvent, store: Store): Step | null => {
  const currentStep = isOnLine(event, store);

  if (currentStep) {
    const step = { ...event.lngLat, isAuxiliary: false, id: uuidv4() };
    store.insert(step, currentStep);
    return step;
  }
  return null;
};

export const updateUIAfterInsert = (event: MapLayerMouseEvent, context: EventsProps) => {
  const { store, tiles } = context;
  if (store.tail?.val) {
    PointVisibility.setSinglePointHidden(event);
    tiles.render();
  }
};

export const checkIfPointClicked = (event: MapLayerMouseEvent) => {
  return MapUtils.isFeatureTriggered(event, [
    ELAYERS.PointsLayer,
    ELAYERS.FirstPointLayer,
    ELAYERS.AuxiliaryPointLayer,
  ]);
};
