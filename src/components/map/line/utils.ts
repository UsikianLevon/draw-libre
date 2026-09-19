import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import type { Step } from "#app/types/index";
import type { EngineMap } from "#app/types/engine";

import { ELAYERS, ESOURCES, LINE_BASE } from "#app/utils/geo_constants";
import { uuidv4 } from "#app/utils/helpers";
import { timeline } from "#app/history";

import { PointVisibility } from "../points/helpers";
import { InsertPointCommand } from "../points/commands/insert-point";
import { renderer } from "../renderer";
import { isFeatureTriggered, POINT_HIT_LAYERS } from "../utils";
import { TilesContext } from "../tiles";

export const insertStepIfOnLine = (
  event: MapLayerMouseEvent,
  context: Pick<TilesContext, "store" | "projection">,
): Step | null => {
  const { store, projection } = context;
  const hit = projection.hit(event.point);

  if (!hit || hit.vertexDistance < hit.vertexHitRadius) {
    return null;
  }

  const step = { ...hit.projected, isAuxiliary: false, id: uuidv4() };
  timeline.commit(new InsertPointCommand(store, step, hit.segmentStart));
  return step;
};

export const updateUIAfterInsert = (event: MapLayerMouseEvent, context: Pick<TilesContext, "store">) => {
  const { store } = context;
  if (store.tail?.val) {
    PointVisibility.setSinglePointHidden(event);
    renderer.execute();
  }
};

export const checkIfPointClicked = (event: MapLayerMouseEvent) => {
  return isFeatureTriggered(event, POINT_HIT_LAYERS);
};

export const hideDynamicLine = (map: EngineMap) => {
  const lineSource = map.getSource(ESOURCES.LineDynamicSource) as GeoJSONSource;
  if (lineSource) {
    lineSource.setData(LINE_BASE as GeoJSON.FeatureCollection);
  }
  if (map.getLayer(ELAYERS.LineDynamicLayer)) {
    map.setLayoutProperty(ELAYERS.LineDynamicLayer, "visibility", "none");
  }
};
