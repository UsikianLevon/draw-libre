import type { UnifiedMap } from "#app/types/map";
import type { LatLng, StepId, Step } from "#app/types/index";
import { EVENTS } from "#app/utils/constants";
import type { DrawingMode } from "./mode";
import type { Mode } from "./mode/types";
import { TilesContext } from "./tiles";

export class FireEvents {
  static addPoint(step: Step & { total: number }, map: UnifiedMap, mode: DrawingMode) {
    map.fire(EVENTS.ADD, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
      mode: {
        geometry: mode.getMode(),
        closedGeometry: mode.getClosedGeometry(),
      },
    });
  }
  static movePoint(step: { end: LatLng; id: StepId; start: LatLng; total: number }, map: UnifiedMap) {
    map.fire(EVENTS.MOVE_END, {
      id: step.id,
      start_coordinates: {
        lat: step.start.lat,
        lng: step.start.lng,
      },
      end_coordinates: {
        lat: step.end.lat,
        lng: step.end.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }
  static pointRemoveRightClick(step: Step & { total: number }, map: UnifiedMap) {
    map.fire(EVENTS.RIGHTCLICKREMOVE, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }
  static enterPoint(step: Step & { total: number }, map: UnifiedMap) {
    map.fire(EVENTS.POINTENTER, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }
  static leavePoint(step: Step & { total: number }, map: UnifiedMap) {
    map.fire(EVENTS.POINT_LEAVE, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }
  static undo(step: Step & { total: number }, map: UnifiedMap, originalEvent?: Event) {
    map.fire(EVENTS.UNDO, {
      originalEvent,
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }

  static redo(step: Step & { total: number }, map: UnifiedMap, originalEvent?: Event) {
    map.fire(EVENTS.REDO, {
      originalEvent,
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }

  static modeChanged(map: UnifiedMap, mode: Mode | "break") {
    map.fire(EVENTS.MODE_CHANGED, {
      mode,
    });
  }
  static removeAllPoints(map: UnifiedMap, originalEvent: Event) {
    map.fire(EVENTS.REMOVE_ALL, { originalEvent });
  }
  static onSaveClick(context: Pick<TilesContext, "map" | "mode">, steps: Step[], originalEvent: Event) {
    const { map, mode } = context;

    map.fire(EVENTS.SAVE, {
      originalEvent,
      timestamp: Date.now(),
      steps,
      mode: {
        geometry: mode.getMode(),
        closedGeometry: mode.getClosedGeometry(),
      },
    });
  }
  static onLineBreak(map: UnifiedMap) {
    map.fire(EVENTS.BREAK);
  }

  static onUndoStackChange = (map: UnifiedMap, length?: number) => {
    map.fire(EVENTS.UNDO_STACK_CHANGED, { length });
  };

  static onRedoStackChange = (map: UnifiedMap, length?: number) => {
    map.fire(EVENTS.REDO_STACK_CHANGED, { length });
  };
}
