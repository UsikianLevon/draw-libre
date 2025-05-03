import type { UnifiedMap } from "#app/types/map";

import { ELAYERS, FIRST_POINT_COLOR, generateLayersToRender, FIRST_POINT_RADIUS } from "#app/utils/geo_constants";
import type { RequiredDrawOptions } from "#app/types/index";

const firstPointCircleRadius = (map: UnifiedMap) => {
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-radius", FIRST_POINT_RADIUS.large);
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-stroke-color", FIRST_POINT_COLOR.large);
};

const defaultPointCircleRadius = (map: UnifiedMap) => {
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-radius", FIRST_POINT_RADIUS.default);
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-stroke-color", FIRST_POINT_COLOR.default);
};

export const togglePointCircleRadius = (map: UnifiedMap, type: keyof typeof FIRST_POINT_RADIUS) => {
  if (type === "large") {
    firstPointCircleRadius(map);
  } else {
    defaultPointCircleRadius(map);
  }
};

export const removeTransparentLine = (map: UnifiedMap) => {
  if (map.getLayer(ELAYERS.LineLayerTransparent)) {
    map.removeLayer(ELAYERS.LineLayerTransparent);
  }
};

export const addTransparentLine = (map: UnifiedMap, options: RequiredDrawOptions) => {
  if (map.getLayer(ELAYERS.LineLayerTransparent)) return;
  const LAYERS_TO_RENDER = generateLayersToRender(options);
  const transparentLayer = LAYERS_TO_RENDER.find((layer) => layer.id === ELAYERS.LineLayerTransparent);
  if (transparentLayer) {
    map.addLayer(transparentLayer);
  }
};
