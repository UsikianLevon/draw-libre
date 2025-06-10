import type { RequiredDrawOptions } from "#app/types";
import {
  ON_LINE_POINT_PAINT_BASE,
  FIRST_POINT_PAINT_BASE,
  POINTS_PAINT_BASE,
  LINE_PAINT_BASE,
  POLYGON_PAINT_BASE,
  BREAK_PAINT_BASE,
} from "#app/utils/geo_constants";

export const DEFAULT_OPTIONS: RequiredDrawOptions = {
  pointGeneration: "manual",
  panel: {
    size: "medium",
    buttons: {
      undo: { visible: true },
      redo: { visible: true },
      delete: { visible: true },
      save: { visible: true, clearOnSave: true },
    },
  },
  modes: {
    initial: null,
    line: {
      visible: true,
      closeGeometry: true,
    },
    polygon: {
      visible: true,
    },
    breakGeometry: {
      visible: true,
    },
  },
  layersPaint: {
    onLinePoint: ON_LINE_POINT_PAINT_BASE,
    firstPoint: FIRST_POINT_PAINT_BASE,
    points: POINTS_PAINT_BASE,
    line: LINE_PAINT_BASE,
    polygon: POLYGON_PAINT_BASE,
    breakLine: BREAK_PAINT_BASE,
  },
  initial: null,
  dynamicLine: true,
  locale: {
    save: "Save",
    delete: "Delete all",
    undo: "Undo",
    redo: "Redo",
    line: "Line",
    polygon: "Polygon",
    break: "Split",
    closeLine: "Close the line",
    createPolygon: "Create a polygon",
  },
};
