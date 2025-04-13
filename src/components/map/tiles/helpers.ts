import type { CustomMap } from "#types/map";

import { ELAYERS, FIRST_POINT_COLOR, generateLayersToRender, FIRST_POINT_RADIUS } from "#utils/geo_constants";
import type { RequiredDrawOptions } from "#types/index";


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
  if (map.getLayer(ELAYERS.LineLayerTransparent)) {
    map.removeLayer(ELAYERS.LineLayerTransparent);
  }
};

export const addTransparentLine = (map: CustomMap, options: RequiredDrawOptions) => {
  if (map.getLayer(ELAYERS.LineLayerTransparent)) return;
  const LAYERS_TO_RENDER = generateLayersToRender(options);
  const transparentLayer = LAYERS_TO_RENDER.find((layer) => layer.id === ELAYERS.LineLayerTransparent);
  if (transparentLayer) {
    map.addLayer(transparentLayer);
  }
};

// not using dblclick event because it's not working properly(fires if we add point and then move it fast)
export const createDoubleClickDetector = (threshold = 400) => {
  let lastClickTime = 0;

  return () => {
    const now = Date.now();

    if (now - lastClickTime <= threshold) {
      lastClickTime = now;
      return true;
    }

    lastClickTime = now;
    return false;
  };
};