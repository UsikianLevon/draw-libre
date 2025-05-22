import type { MapLayerMouseEvent } from "maplibre-gl";
import type { EventsCtx, Step } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";

import type { Store } from "#app/store/index";
import { ELAYERS } from "#app/utils/geo_constants";
import { MapUtils, Spatial, uuidv4 } from "#app/utils/helpers";
import { PointVisibility } from "../points/helpers";
import { timeline } from "#app/history";
import { InsertPointCommand } from "../points/commands/insert-point";

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
  const segmentStart = isOnLine(event, store);

  if (segmentStart) {
    const step = { ...event.lngLat, isAuxiliary: false, id: uuidv4() };
    timeline.commit(new InsertPointCommand(store, step, segmentStart));
    return step;
  }
  return null;
};

export const updateUIAfterInsert = (event: MapLayerMouseEvent, context: EventsCtx) => {
  const { store, renderer } = context;
  if (store.tail?.val) {
    PointVisibility.setSinglePointHidden(event);
    renderer.execute();
  }
};

export const checkIfPointClicked = (event: MapLayerMouseEvent) => {
  return MapUtils.isFeatureTriggered(event, [
    ELAYERS.PointsLayer,
    ELAYERS.FirstPointLayer,
    ELAYERS.AuxiliaryPointLayer,
  ]);
};
