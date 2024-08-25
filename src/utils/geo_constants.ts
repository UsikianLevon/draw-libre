import type { RequiredDrawOptions } from "#types/index";
import type { AddLayerObject } from "maplibre-gl";

export const POLYGON_BASE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [],
      },
    },
  ],
};

export const LINE_BASE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [],
      },
    },
  ],
};

export const POINT_BASE = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [],
      },
    },
  ],
};

export const ELAYERS = {
  LineDynamicLayer: "mdl-line-dynamic-layer",
  LineLayer: "mdl-line-layer",
  LineLayerTransparent: "mdl-line-layer-transparent",
  LineLayerBreak: "mdl-line-break-layer",
  PolygonLayer: "mdl-polygon-layer",
  PointsLayer: "mdl-points-layer",
  SinglePointLayer: "mdl-single-point-layer",
  FirstPointLayer: "mdl-first-point-layer",
} as const;

export const ESOURCES = {
  LineDynamicSource: "mdl-line-dynamic-source",
  LineSourceBreak: "mdl-line-source-break",
  LineSource: "mdl-line-source",
  PolygonSource: "mdl-polygon-source",
  PointsSource: "mdl-points-source",
  SinglePointSource: "mdl-single-point-source",
} as const;

export const FIRST_POINT_RADIUS = {
  large: 6.5,
  default: 5.5,
};

export const FIRST_POINT_COLOR = {
  large: "#FF6464",
  default: "#666666",
};

export const FIRST_POINT_PAINT_BASE = {
  "circle-radius": FIRST_POINT_RADIUS["default"],
  "circle-color": "#FEFFFE",
  "circle-stroke-color": FIRST_POINT_COLOR["default"],
  "circle-stroke-width": 3,
};

export const ON_LINE_POINT_PAINT_BASE = {
  "circle-radius": FIRST_POINT_RADIUS["large"],
  "circle-color": "#FEFFFE",
  "circle-stroke-color": "#666666",
  "circle-stroke-width": 3,
};

export const POLYGON_PAINT_BASE = {
  "fill-color": "grey",
  "fill-opacity": 0.4,
};

export const LINE_PAINT_BASE = {
  "line-width": 3,
  "line-color": "grey",
  "line-opacity": 0.7,
};

export const POINTS_PAINT_BASE = {
  "circle-radius": FIRST_POINT_RADIUS["default"],
  "circle-color": "#FEFFFE",
  "circle-stroke-color": "#666666",
  "circle-stroke-width": 3,
};

export const BREAK_PAINT_BASE = {
  "line-width": 3,
  "line-color": "#FF6464",
  "line-dasharray": [3, 3],
};

export const generateLayersToRender = (options: RequiredDrawOptions) => {
  return [
    {
      id: ELAYERS.SinglePointLayer,
      source: ESOURCES.SinglePointSource,
      type: "circle",
      paint: options.layersPaint.onLinePoint,
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.PolygonLayer,
      source: ESOURCES.PolygonSource,
      type: "fill",
      paint: options.layersPaint.polygon,
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.LineDynamicLayer,
      source: ESOURCES.LineDynamicSource,
      type: "line",
      paint: options.layersPaint.line,
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.LineLayer,
      source: ESOURCES.LineSource,
      type: "line",
      paint: options.layersPaint.line,
      layout: {
        visibility: "visible",
      },
    },
    {
      id: ELAYERS.LineLayerTransparent,
      source: ESOURCES.LineSource,
      type: "line",
      paint: {
        "line-width": 4,
        "line-color": "transparent",
      },
    },
    {
      id: ELAYERS.LineLayerBreak,
      source: ESOURCES.LineSourceBreak,
      type: "line",
      paint: options.layersPaint.breakLine,
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.PointsLayer,
      source: ESOURCES.PointsSource,
      type: "circle",
      paint: options.layersPaint.points,
      filter: ["==", ["get", "isFirst"], false],
    },
    {
      id: ELAYERS.FirstPointLayer,
      source: ESOURCES.PointsSource,
      type: "circle",
      paint: options.layersPaint.firstPoint,
      filter: ["==", ["get", "isFirst"], true],
    },
  ] satisfies AddLayerObject[];
};
