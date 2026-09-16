import type { RequiredDrawOptions } from "#app/types/index";
import type { AddLayerObject, CircleLayerSpecification, FilterSpecification } from "maplibre-gl";

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

export const ELAYERS = {
  LineDynamicLayer: "mdl-line-dynamic-layer",
  LineLayer: "mdl-line-layer",
  LineLayerTransparent: "mdl-line-layer-transparent",
  LineLayerBreak: "mdl-line-break-layer",
  PolygonLayer: "mdl-polygon-layer",
  PointsLayer: "mdl-points-layer",
  SinglePointLayer: "mdl-single-point-layer",
  FirstPointLayer: "mdl-first-point-layer",
  AuxiliaryPointLayer: "mdl-auxiliary-point-layer",
  PointsHitLayer: "mdl-points-hit-layer",
  FirstPointHitLayer: "mdl-first-point-hit-layer",
  AuxiliaryPointHitLayer: "mdl-auxiliary-point-hit-layer",
} as const;

export const POINTS_FILTER = {
  points: [
    "all",
    ["==", ["geometry-type"], "Point"],
    ["==", ["get", "isFirst"], false],
    ["==", ["get", "isAuxiliary"], false],
  ],
  pointsWhenClosed: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "isAuxiliary"], false]],
  firstPoint: ["==", ["get", "isFirst"], true],
  auxiliaryPoint: ["==", ["get", "isAuxiliary"], true],
} satisfies Record<string, FilterSpecification>;

export const ESOURCES = {
  UnifiedSource: "mdl-unified-source",
  LineDynamicSource: "mdl-line-dynamic-source",
  LineSourceBreak: "mdl-line-source-break",
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
  "circle-radius": FIRST_POINT_RADIUS.default,
  "circle-color": "#FEFFFE",
  "circle-stroke-color": FIRST_POINT_COLOR.default,
  "circle-stroke-width": 3,
};

export const AUXILIARY_POINT_PAINT_BASE = {
  "circle-radius": FIRST_POINT_RADIUS.default - 1.5,
  "circle-color": "#FEFFFE",
  "circle-stroke-color": "#666666",
  "circle-stroke-width": 2,
};

export const ON_LINE_POINT_PAINT_BASE = {
  "circle-radius": FIRST_POINT_RADIUS.large,
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
  "circle-radius": FIRST_POINT_RADIUS.default,
  "circle-color": "#FEFFFE",
  "circle-stroke-color": "#666666",
  "circle-stroke-width": 3,
};

export const DYNAMIC_LINE_PAINT_BASE = {
  ...LINE_PAINT_BASE,
  "line-dasharray": [4.5, 2.5],
};

export const BREAK_PAINT_BASE = {
  "line-width": 3,
  "line-color": "#FF6464",
  "line-dasharray": [3, 3],
};

const HIT_HIGHLIGHT_OPACITY = 0.18;

const POINT_HIT_PAINT = {
  "circle-color": "#666666",
  "circle-opacity": ["case", ["boolean", ["feature-state", "hover"], false], HIT_HIGHLIGHT_OPACITY, 0],
} satisfies CircleLayerSpecification["paint"];

export const generateLayers = (options: RequiredDrawOptions) => {
  const hitPaint = {
    ...POINT_HIT_PAINT,
    "circle-radius": options.interaction.pointHitRadius,
    "circle-pitch-scale": "viewport" as const,
  };

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
      source: ESOURCES.UnifiedSource,
      type: "fill",
      paint: options.layersPaint.polygon,
      layout: {
        visibility: "none",
      },
      filter: ["==", ["geometry-type"], "Polygon"],
    },
    {
      id: ELAYERS.LineDynamicLayer,
      source: ESOURCES.LineDynamicSource,
      type: "line",
      paint: options.layersPaint.dynamicLine,
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.LineLayer,
      source: ESOURCES.UnifiedSource,
      type: "line",
      paint: options.layersPaint.line,
      layout: {
        visibility: "visible",
      },
      filter: ["==", ["geometry-type"], "LineString"],
    },
    {
      id: ELAYERS.LineLayerTransparent,
      source: ESOURCES.UnifiedSource,
      type: "line",
      paint: {
        "line-width": options.interaction.lineHitRadius * 2,
        "line-color": "transparent",
      },
      filter: ["==", ["geometry-type"], "LineString"],
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
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: options.layersPaint.points,
      filter: POINTS_FILTER.points,
    },
    {
      id: ELAYERS.FirstPointLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: options.layersPaint.firstPoint,
      filter: POINTS_FILTER.firstPoint,
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.AuxiliaryPointLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: options.layersPaint.auxiliaryPoint,
      filter: POINTS_FILTER.auxiliaryPoint,
    },
    {
      id: ELAYERS.PointsHitLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: { ...hitPaint },
      filter: POINTS_FILTER.points,
    },
    {
      id: ELAYERS.FirstPointHitLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: { ...hitPaint },
      filter: POINTS_FILTER.firstPoint,
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.AuxiliaryPointHitLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: { ...hitPaint },
      filter: POINTS_FILTER.auxiliaryPoint,
    },
  ] satisfies AddLayerObject[];
};
