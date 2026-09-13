import type { UnifiedMap } from "#app/types/map";

import { ELAYERS, FIRST_POINT_COLOR, FIRST_POINT_RADIUS } from "#app/utils/geo_constants";

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

export const hideTransparentLine = (map: UnifiedMap) => {
  if (map.getLayer(ELAYERS.LineLayerTransparent)) {
    map.setLayoutProperty(ELAYERS.LineLayerTransparent, "visibility", "none");
  }
};

export const showTransparentLine = (map: UnifiedMap) => {
  if (map.getLayer(ELAYERS.LineLayerTransparent)) {
    map.setLayoutProperty(ELAYERS.LineLayerTransparent, "visibility", "visible");
  }
};
