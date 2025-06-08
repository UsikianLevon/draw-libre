import { RequiredDrawOptions } from "../types";
import {
  BREAK_PAINT_BASE,
  FIRST_POINT_PAINT_BASE,
  LINE_PAINT_BASE,
  ON_LINE_POINT_PAINT_BASE,
  POINTS_PAINT_BASE,
  POLYGON_PAINT_BASE,
} from "./geo_constants";

export const EVENTS = {
  RIGHTCLICKREMOVE: "mdl:rightclickremove",
  POINTENTER: "mdl:pointenter",
  POINTLEAVE: "mdl:pointleave",
  MOVEEND: "mdl:moveend",
  ADD: "mdl:add",
  UNDO: "mdl:undo",
  REDO: "mdl:redo",
  REMOVEALL: "mdl:removeall",
  SAVE: "mdl:save",
  BREAK: "mdl:break",
  MODECHANGED: "mdl:modechanged",
} as const;

export const MOBILE_WIDTH = 768;

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
