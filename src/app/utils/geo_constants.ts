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
  PointsHaloLayer: "mdl-points-halo-layer",
  FirstPointHaloLayer: "mdl-first-point-halo-layer",
  AuxiliaryPointHaloLayer: "mdl-auxiliary-point-halo-layer",
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

export const FIRST_POINT_CLOSABLE_PAINT_BASE = {
  "circle-radius": FIRST_POINT_RADIUS.large,
  "circle-stroke-color": FIRST_POINT_COLOR.large,
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

export const POINT_HALO_PAINT_BASE = {
  "circle-color": "#666666",
  "circle-opacity": 0.18,
};

// auxiliary circles are drawn 2.5px smaller than regular ones, radius plus stroke
const AUXILIARY_HIT_RADIUS_OFFSET = 2.5;

export const pointHitRadiusOf = (options: RequiredDrawOptions, isAuxiliary: boolean) =>
  isAuxiliary ? options.interaction.pointHitRadius - AUXILIARY_HIT_RADIUS_OFFSET : options.interaction.pointHitRadius;

const haloRadiusOf = (options: RequiredDrawOptions, isAuxiliary: boolean) => {
  const radius = options.layersPaint.pointHalo?.["circle-radius"];
  if (typeof radius !== "number") return pointHitRadiusOf(options, isAuxiliary);
  return isAuxiliary ? Math.max(0, radius - AUXILIARY_HIT_RADIUS_OFFSET) : radius;
};

export const generateLayers = (options: RequiredDrawOptions) => {
  const layout = options.layersLayout;
  const hitPaint = {
    "circle-color": "#000000",
    "circle-opacity": 0,
    "circle-radius": pointHitRadiusOf(options, false),
    "circle-pitch-scale": "viewport" as const,
  };
  const auxiliaryHitPaint = {
    ...hitPaint,
    "circle-radius": pointHitRadiusOf(options, true),
  };
  const halo = { ...POINT_HALO_PAINT_BASE, ...options.layersPaint.pointHalo };
  const haloPaint = {
    "circle-color": halo["circle-color"],
    "circle-opacity": ["case", ["boolean", ["feature-state", "hover"], false], halo["circle-opacity"], 0],
    "circle-radius": haloRadiusOf(options, false),
    "circle-pitch-scale": "viewport",
  } satisfies CircleLayerSpecification["paint"];
  const auxiliaryHaloPaint = {
    ...haloPaint,
    "circle-radius": haloRadiusOf(options, true),
  };

  return [
    {
      id: ELAYERS.SinglePointLayer,
      source: ESOURCES.SinglePointSource,
      type: "circle",
      paint: options.layersPaint.onLinePoint,
      layout: { ...layout.onLinePoint, visibility: "none" },
    },
    {
      id: ELAYERS.PolygonLayer,
      source: ESOURCES.UnifiedSource,
      type: "fill",
      paint: options.layersPaint.polygon,
      layout: { ...layout.polygon, visibility: "none" },
      filter: ["==", ["geometry-type"], "Polygon"],
    },
    {
      id: ELAYERS.LineDynamicLayer,
      source: ESOURCES.LineDynamicSource,
      type: "line",
      paint: options.layersPaint.dynamicLine,
      layout: { ...layout.dynamicLine, visibility: "none" },
    },
    {
      id: ELAYERS.LineLayer,
      source: ESOURCES.UnifiedSource,
      type: "line",
      paint: options.layersPaint.line,
      layout: { ...layout.line, visibility: "visible" },
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
      layout: { ...layout.breakLine, visibility: "none" },
    },
    {
      id: ELAYERS.PointsLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: options.layersPaint.points,
      filter: POINTS_FILTER.points,
      layout: layout.points,
    },
    {
      id: ELAYERS.FirstPointLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: options.layersPaint.firstPoint,
      filter: POINTS_FILTER.firstPoint,
      layout: { ...layout.firstPoint, visibility: "none" },
    },
    {
      id: ELAYERS.AuxiliaryPointLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: options.layersPaint.auxiliaryPoint,
      filter: POINTS_FILTER.auxiliaryPoint,
      layout: layout.auxiliaryPoint,
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
      paint: auxiliaryHitPaint,
      filter: POINTS_FILTER.auxiliaryPoint,
    },
    {
      id: ELAYERS.PointsHaloLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: { ...haloPaint },
      filter: POINTS_FILTER.points,
    },
    {
      id: ELAYERS.FirstPointHaloLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: { ...haloPaint },
      filter: POINTS_FILTER.firstPoint,
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.AuxiliaryPointHaloLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: auxiliaryHaloPaint,
      filter: POINTS_FILTER.auxiliaryPoint,
    },
  ] satisfies AddLayerObject[];
};
