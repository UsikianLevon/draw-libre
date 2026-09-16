import type { CircleLayerSpecification } from "maplibre-gl";

import type { EngineMap } from "#app/types/engine";

import { ELAYERS, FIRST_POINT_COLOR, FIRST_POINT_RADIUS } from "#app/utils/geo_constants";

type FirstPointPaint = CircleLayerSpecification["paint"];

const firstPointCircleRadius = (map: EngineMap, paint: FirstPointPaint) => {
  const radius = paint?.["circle-radius"];
  map.setPaintProperty(
    ELAYERS.FirstPointLayer,
    "circle-radius",
    typeof radius === "number" ? radius + 1 : radius ?? FIRST_POINT_RADIUS.large,
  );
  map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-stroke-color", FIRST_POINT_COLOR.large);
};

const defaultPointCircleRadius = (map: EngineMap, paint: FirstPointPaint) => {
  map.setPaintProperty(
    ELAYERS.FirstPointLayer,
    "circle-radius",
    paint?.["circle-radius"] ?? FIRST_POINT_RADIUS.default,
  );
  map.setPaintProperty(
    ELAYERS.FirstPointLayer,
    "circle-stroke-color",
    paint?.["circle-stroke-color"] ?? FIRST_POINT_COLOR.default,
  );
};

export const togglePointCircleRadius = (
  map: EngineMap,
  type: keyof typeof FIRST_POINT_RADIUS,
  paint: FirstPointPaint,
) => {
  if (type === "large") {
    firstPointCircleRadius(map, paint);
  } else {
    defaultPointCircleRadius(map, paint);
  }
};
