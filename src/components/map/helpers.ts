import type { UnifiedMap } from "#app/types/map";
import type { LatLng, StepId, Step, EventsCtx } from "#app/types/index";
import { EVENTS } from "#app/utils/constants";
import type { DrawingMode } from "./mode";
import type { Mode } from "./mode/types";

// TODO this shouldn't be here and it's just bunch of static methods in a class, which is bad.
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
    map.fire(EVENTS.MOVEEND, {
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
    map.fire(EVENTS.POINTLEAVE, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }
  static undoPoint(step: Step & { total: number }, map: UnifiedMap, originalEvent?: Event) {
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
  static modeChanged(map: UnifiedMap, mode: Mode | "break") {
    map.fire(EVENTS.MODECHANGED, {
      mode,
    });
  }
  static removeAllPoints(map: UnifiedMap, originalEvent: Event) {
    map.fire(EVENTS.REMOVEALL, { originalEvent });
  }
  static onSaveClick(context: Pick<EventsCtx, "map" | "mode">, steps: Step[], originalEvent: Event) {
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
}
