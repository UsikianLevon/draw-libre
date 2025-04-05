import type { CustomMap } from "#types/map";

import { ELAYERS, FIRST_POINT_COLOR, generateLayersToRender, FIRST_POINT_RADIUS } from "#utils/geo_constants";
import type { RequiredDrawOptions } from "#types/index";

let lastClickTime = 0;

const firstPointCircleRadius = (map: CustomMap) => {
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-radius", FIRST_POINT_RADIUS.large);
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-stroke-color", FIRST_POINT_COLOR.large);
};

const defaultPointCircleRadius = (map: CustomMap) => {
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-radius", FIRST_POINT_RADIUS.default);
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-stroke-color", FIRST_POINT_COLOR.default);
};

export const togglePointCircleRadius = (map: CustomMap, type: keyof typeof FIRST_POINT_RADIUS) => {
  if (type === "large") {
    firstPointCircleRadius(map);
  } else {
    defaultPointCircleRadius(map);
  }
};

export const removeTransparentLine = (map: CustomMap) => {
  map.removeLayer(ELAYERS.LineLayerTransparent);
};

export const addTransparentLine = (map: CustomMap, options: RequiredDrawOptions) => {
  if (map.getLayer(ELAYERS.LineLayerTransparent)) return;
  const LAYERS_TO_RENDER = generateLayersToRender(options);
  const transparentLayer = LAYERS_TO_RENDER.find((layer) => layer.id === ELAYERS.LineLayerTransparent);
  if (transparentLayer) {
    map.addLayer(transparentLayer);
  }
};

export const isDoubleClick = () => {
  const DOUBLE_CLICK_THRESHOLD = 400;
  const now = Date.now();

  if (now - lastClickTime <= DOUBLE_CLICK_THRESHOLD) {
    lastClickTime = now;
    return true;
  }

  lastClickTime = now;
  return false;
};
