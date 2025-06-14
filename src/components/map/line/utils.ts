import type { MapLayerMouseEvent } from "maplibre-gl";
import type { Step, Point } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";
import type { Store } from "#app/store/index";

import { ELAYERS } from "#app/utils/geo_constants";
import { uuidv4 } from "#app/utils/helpers";
import { timeline } from "#app/history";

import { PointVisibility } from "../points/helpers";
import { InsertPointCommand } from "../points/commands/insert-point";
import { renderer } from "../renderer";
import { isFeatureTriggered } from "../utils";
import { TilesContext } from "../tiles";

// √((x1​−x2​)²+(y1​−y2​)²​)
const distance = (point1: Point, point2: Point) =>
  Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));

const checkIfPointIsOnLine = (A: Point, B: Point, P: Point): boolean => {
  const EPSILON = 0.1;

  const AB = distance(A, B);
  const AP = distance(A, P);
  const PB = distance(P, B);

  if (Math.abs(AP + PB - AB) < EPSILON) {
    return true;
  }

  return false;
};

export const isOnLine = (event: MapLayerMouseEvent, store: Store) => {
  let current = store.head;
  const visited = new Set();

  while (current !== null) {
    if (visited.has(current)) break;
    if (current?.next?.val && current?.val) {
      const map = event.target as UnifiedMap;
      const aPixel = map.project(current.val);
      const bPixel = map.project(current.next.val);
      const eventPixel = map.project(event.lngLat);
      if (checkIfPointIsOnLine(aPixel, bPixel, eventPixel)) {
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

export const updateUIAfterInsert = (event: MapLayerMouseEvent, context: Pick<TilesContext, "store">) => {
  const { store } = context;
  if (store.tail?.val) {
    PointVisibility.setSinglePointHidden(event);
    renderer.execute();
  }
};

export const checkIfPointClicked = (event: MapLayerMouseEvent) => {
  return isFeatureTriggered(event, [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer, ELAYERS.AuxiliaryPointLayer]);
};
