import { ERRORS } from "#app/store/init";
import type { Initial, DrawOptions, RequiredDrawOptions, StrictLayersPaint } from "#app/types/index";
import {
  ON_LINE_POINT_PAINT_BASE,
  FIRST_POINT_PAINT_BASE,
  POINTS_PAINT_BASE,
  LINE_PAINT_BASE,
  DYNAMIC_LINE_PAINT_BASE,
  POLYGON_PAINT_BASE,
  BREAK_PAINT_BASE,
  AUXILIARY_POINT_PAINT_BASE,
} from "../utils/geo_constants";
import { DEFAULT_OPTIONS, interactionDefaults } from "./constants";

function allStepsHaveIds(steps: Initial["steps"]): boolean {
  return steps.every((step) => "id" in step && step.id !== undefined);
}

function checkIfMissingIds(steps: Initial["steps"], generateId: Initial["generateId"]) {
  const idGenerationIsOff = !generateId;
  const idsNotProvided = !allStepsHaveIds(steps);
  if (idGenerationIsOff && idsNotProvided) {
    throw new Error(ERRORS["MISSING_IDS"]);
  }
}

function checkIfStepsAreEmpty(steps: Initial["steps"]) {
  if (!steps.length) {
    throw new Error(ERRORS["EMPTY_INITIAL_STATE"]);
  }
}

function checkIfEnoughPointsToClose(steps: Initial["steps"], closeGeometry: Initial["closeGeometry"]) {
  const minPointsToCloseGeometry = 3;
  const differentPoints = new Set(steps.map((step) => `${step.lng},${step.lat}`)).size;
  if (closeGeometry && differentPoints < minPointsToCloseGeometry) {
    throw new Error(ERRORS["NOT_ENOUGH_POINTS_TO_CLOSE"]);
  }
}

function checkIfPolygonIsClosed(options: Initial) {
  const { closeGeometry, steps } = options;
  if (steps) {
    const firstLng = steps[0]?.lng;
    const lastLng = steps[steps.length - 1]?.lng;
    const firstLat = steps[0]?.lat;
    const lastLat = steps[steps.length - 1]?.lat;
    const firstAndLastNotEqual = firstLng !== lastLng || firstLat !== lastLat;
    if (firstAndLastNotEqual && closeGeometry) {
      throw new Error(ERRORS["FIRST_LAST_POINT_NOT_EQUAL"]);
    }
  }
}

export function checkInitialStepsOptionOnErrors(options: Initial): void {
  const { closeGeometry, generateId, steps } = options;
  checkIfStepsAreEmpty(steps);
  // checks ids exist when id generation is off
  checkIfMissingIds(steps, generateId);
  // closing the geometry needs at least three points
  checkIfEnoughPointsToClose(steps, closeGeometry);
  // a polygon must have closeGeometry set to true
  checkIfPolygonIsClosed(options);
}

export function initOptions(options?: DrawOptions): RequiredDrawOptions {
  const interaction = interactionDefaults(matchesMedia("(pointer: coarse)"));
  const canHover = !matchesMedia("(hover: none)");

  if (!options) {
    return { ...DEFAULT_OPTIONS, interaction, dynamicLine: DEFAULT_OPTIONS.dynamicLine && canHover };
  }

  return {
    pointGeneration: options.pointGeneration ?? DEFAULT_OPTIONS.pointGeneration,
    panel: generatePanelOptions(options),
    modes: generateModeOptions(options),
    layersPaint: generateLayersOptions(options),
    interaction,
    initial: options.initial || DEFAULT_OPTIONS["initial"],
    locale: generateLocaleOptions(options),
    dynamicLine: (options.dynamicLine ?? DEFAULT_OPTIONS.dynamicLine) && canHover,
  } as RequiredDrawOptions;
}
const matchesMedia = (query: string) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false;

function generatePanelOptions(options: DrawOptions): RequiredDrawOptions["panel"] {
  return {
    size: options.panel?.size || DEFAULT_OPTIONS.panel.size,
    buttons: {
      undo: {
        visible: options.panel?.buttons?.undo?.visible ?? DEFAULT_OPTIONS.panel.buttons.undo.visible,
      },
      redo: {
        visible: options.panel?.buttons?.redo?.visible ?? DEFAULT_OPTIONS.panel.buttons.redo.visible,
      },
      delete: {
        visible: options.panel?.buttons?.delete?.visible ?? DEFAULT_OPTIONS.panel.buttons.delete.visible,
      },
      save: {
        visible: options.panel?.buttons?.save?.visible ?? DEFAULT_OPTIONS.panel.buttons.save.visible,
        clearOnSave: options.panel?.buttons?.save?.clearOnSave ?? DEFAULT_OPTIONS.panel.buttons.save.clearOnSave,
      },
    },
  };
}

function generateModeOptions(options: DrawOptions): RequiredDrawOptions["modes"] {
  return {
    initial: options.modes?.initial || DEFAULT_OPTIONS.modes.initial,
    line: {
      visible:
        options?.modes?.line?.visible !== undefined
          ? options.modes.line.visible
          : options?.initial?.geometry === "line" || DEFAULT_OPTIONS.modes.line.visible,
      closeGeometry: options?.modes?.line?.closeGeometry ?? DEFAULT_OPTIONS.modes.line.closeGeometry,
    },
    polygon: {
      visible:
        options?.modes?.polygon?.visible !== undefined
          ? options.modes.polygon.visible
          : options?.initial?.geometry === "polygon" || DEFAULT_OPTIONS.modes.polygon.visible,
    },
    breakGeometry: {
      visible: options?.modes?.breakGeometry?.visible ?? DEFAULT_OPTIONS.modes.breakGeometry.visible,
    },
  };
}

function generateLayersOptions(options: DrawOptions): RequiredDrawOptions["layersPaint"] {
  const paint = options.layersPaint as StrictLayersPaint | undefined;
  const line = {
    "line-width": paint?.line?.["line-width"] || LINE_PAINT_BASE["line-width"],
    "line-color": paint?.line?.["line-color"] || LINE_PAINT_BASE["line-color"],
    "line-opacity": paint?.line?.["line-opacity"] || LINE_PAINT_BASE["line-opacity"],
    ...paint?.line,
  };

  return {
    onLinePoint: {
      "circle-radius": paint?.onLinePoint?.["circle-radius"] || ON_LINE_POINT_PAINT_BASE["circle-radius"],
      "circle-color": paint?.onLinePoint?.["circle-color"] || ON_LINE_POINT_PAINT_BASE["circle-color"],
      "circle-stroke-color":
        paint?.onLinePoint?.["circle-stroke-color"] || ON_LINE_POINT_PAINT_BASE["circle-stroke-color"],
      "circle-stroke-width":
        paint?.onLinePoint?.["circle-stroke-width"] || ON_LINE_POINT_PAINT_BASE["circle-stroke-width"],
      ...paint?.onLinePoint,
    },
    firstPoint: {
      "circle-radius": paint?.firstPoint?.["circle-radius"] || FIRST_POINT_PAINT_BASE["circle-radius"],
      "circle-color": paint?.firstPoint?.["circle-color"] || FIRST_POINT_PAINT_BASE["circle-color"],
      "circle-stroke-color":
        paint?.firstPoint?.["circle-stroke-color"] || FIRST_POINT_PAINT_BASE["circle-stroke-color"],
      "circle-stroke-width":
        paint?.firstPoint?.["circle-stroke-width"] || FIRST_POINT_PAINT_BASE["circle-stroke-width"],
      ...paint?.firstPoint,
    },
    points: {
      "circle-radius": paint?.points?.["circle-radius"] || POINTS_PAINT_BASE["circle-radius"],
      "circle-color": paint?.points?.["circle-color"] || POINTS_PAINT_BASE["circle-color"],
      "circle-stroke-color": paint?.points?.["circle-stroke-color"] || POINTS_PAINT_BASE["circle-stroke-color"],
      "circle-stroke-width": paint?.points?.["circle-stroke-width"] || POINTS_PAINT_BASE["circle-stroke-width"],
      ...paint?.points,
    },
    auxiliaryPoint: {
      "circle-radius": paint?.auxiliaryPoint?.["circle-radius"] || AUXILIARY_POINT_PAINT_BASE["circle-radius"],
      "circle-color": paint?.auxiliaryPoint?.["circle-color"] || AUXILIARY_POINT_PAINT_BASE["circle-color"],
      "circle-stroke-color":
        paint?.auxiliaryPoint?.["circle-stroke-color"] || AUXILIARY_POINT_PAINT_BASE["circle-stroke-color"],
      "circle-stroke-width":
        paint?.auxiliaryPoint?.["circle-stroke-width"] || AUXILIARY_POINT_PAINT_BASE["circle-stroke-width"],
      ...paint?.auxiliaryPoint,
    },
    line,
    dynamicLine: {
      ...line,
      "line-dasharray": DYNAMIC_LINE_PAINT_BASE["line-dasharray"],
      ...paint?.dynamicLine,
    },
    polygon: {
      "fill-color": paint?.polygon?.["fill-color"] || POLYGON_PAINT_BASE["fill-color"],
      "fill-opacity": paint?.polygon?.["fill-opacity"] || POLYGON_PAINT_BASE["fill-opacity"],
      ...paint?.polygon,
    },
    breakLine: {
      "line-width": paint?.breakLine?.["line-width"] || BREAK_PAINT_BASE["line-width"],
      "line-color": paint?.breakLine?.["line-color"] || BREAK_PAINT_BASE["line-color"],
      "line-dasharray": paint?.breakLine?.["line-dasharray"] || BREAK_PAINT_BASE["line-dasharray"],
      ...paint?.breakLine,
    },
  };
}

function generateLocaleOptions(options: DrawOptions): RequiredDrawOptions["locale"] {
  return {
    save: options.locale?.save ?? DEFAULT_OPTIONS.locale.save,
    delete: options.locale?.delete ?? DEFAULT_OPTIONS.locale.delete,
    undo: options.locale?.undo ?? DEFAULT_OPTIONS.locale.undo,
    redo: options.locale?.redo ?? DEFAULT_OPTIONS.locale.redo,
    line: options.locale?.line ?? DEFAULT_OPTIONS.locale.line,
    polygon: options.locale?.polygon ?? DEFAULT_OPTIONS.locale.polygon,
    break: options.locale?.break ?? DEFAULT_OPTIONS.locale.break,
    closeLine: options.locale?.closeLine ?? DEFAULT_OPTIONS.locale.closeLine,
    createPolygon: options.locale?.createPolygon ?? DEFAULT_OPTIONS.locale.createPolygon,
    removePoint: options.locale?.removePoint ?? DEFAULT_OPTIONS.locale.removePoint,
  };
}
