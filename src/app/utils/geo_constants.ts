import type { RequiredDrawOptions } from "#app/types/index";
import type { AddLayerObject } from "maplibre-gl";

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
} as const;

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

export const BREAK_PAINT_BASE = {
  "line-width": 3,
  "line-color": "#FF6464",
  "line-dasharray": [3, 3],
};

export const generateLayers = (options: RequiredDrawOptions) => {
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
      filter: ["==", "$type", "Polygon"],
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
      source: ESOURCES.UnifiedSource,
      type: "line",
      paint: options.layersPaint.line,
      layout: {
        visibility: "visible",
      },
      filter: ["==", "$type", "LineString"],
    },
    {
      id: ELAYERS.LineLayerTransparent,
      source: ESOURCES.UnifiedSource,
      type: "line",
      paint: {
        "line-width": 4,
        "line-color": "transparent",
      },
      filter: ["==", "$type", "LineString"],
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
      filter: ["all", ["==", "$type", "Point"], ["==", "isFirst", false], ["==", "isAuxiliary", false]],
    },
    {
      id: ELAYERS.FirstPointLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: options.layersPaint.firstPoint,
      filter: ["==", ["get", "isFirst"], true],
      layout: {
        visibility: "none",
      },
    },
    {
      id: ELAYERS.AuxiliaryPointLayer,
      source: ESOURCES.UnifiedSource,
      type: "circle",
      paint: options.layersPaint.auxiliaryPoint,
      filter: ["==", ["get", "isAuxiliary"], true],
    },
  ] satisfies AddLayerObject[];
};
