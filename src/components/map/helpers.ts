import type { CustomMap } from "#types/map";
import type { LatLng, StepId, Step, EventsProps } from "#types/index";
import { EVENTS } from "#utils/constants";
import type { DrawingMode } from "./mode";
import type { Mode } from "./mode/types";

export class FireEvents {
  static addPoint(step: Step & { total: number }, map: CustomMap, mode: DrawingMode) {
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
  static movePoint(step: { end: LatLng; id: StepId; start: LatLng; total: number }, map: CustomMap) {
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
  static pointDoubleClick(step: Step & { total: number }, map: CustomMap) {
    map.fire(EVENTS.DOUBLECLICK, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }
  static enterPoint(step: Step & { total: number }, map: CustomMap) {
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
  static leavePoint(step: Step & { total: number }, map: CustomMap) {
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
  static undoPoint(step: Step & { total: number }, map: CustomMap, originalEvent?: Event) {
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
  static modeChanged(map: CustomMap, mode: Mode | "break") {
    map.fire(EVENTS.MODECHANGED, {
      mode,
    });
  }
  static removeAllPoints(map: CustomMap, originalEvent: Event) {
    map.fire(EVENTS.REMOVEALL, { originalEvent });
  }
  static onSaveClick(context: Pick<EventsProps, "map" | "mode">, steps: Step[], originalEvent: Event) {
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
  static onLineBreak(map: CustomMap) {
    map.fire(EVENTS.BREAK);
  }
}
