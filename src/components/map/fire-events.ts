import type { Emitter } from "#app/events/emitter";
import type { EngineMap } from "#app/types/engine";
import type { LatLng, StepId, Step } from "#app/types/index";
import { EVENTS } from "#app/utils/constants";
import type { DrawingMode } from "./mode";
import type { Mode } from "./mode/types";
import type { TilesContext } from "./tiles";
import type { DrawLibreEventType } from "./types";

type EventName = keyof DrawLibreEventType;
type EventFields<T extends EventName> = Omit<DrawLibreEventType[T], "type" | "target">;

type FiringMap = { fire(type: string, properties?: object): unknown };

type QueuedEvent = {
  map: EngineMap;
  type: EventName;
  payload: DrawLibreEventType[EventName];
  emitter: Emitter<DrawLibreEventType> | null;
};

export class FireEvents {
  private static emitter: Emitter<DrawLibreEventType> | null = null;
  private static queue: QueuedEvent[] = [];
  private static delivering = false;

  static bind(emitter: Emitter<DrawLibreEventType>) {
    FireEvents.emitter = emitter;
  }

  static unbind(emitter: Emitter<DrawLibreEventType>) {
    if (FireEvents.emitter === emitter) FireEvents.emitter = null;
  }

  private static dispatch<T extends EventName>(map: EngineMap, type: T, fields: EventFields<T>) {
    const payload = { ...fields, type, target: map } as unknown as DrawLibreEventType[T];
    // the receiver is fixed here, a listener of this event may remove the control before it is delivered
    FireEvents.queue.push({ map, type, payload, emitter: FireEvents.emitter });
    // an event fired from inside a listener waits, so both channels see the same order
    if (FireEvents.delivering) return;

    FireEvents.delivering = true;
    try {
      let next = FireEvents.queue.shift();
      while (next) {
        (next.map as unknown as FiringMap).fire(next.type, next.payload);
        next.emitter?.emit(next.type, next.payload);
        next = FireEvents.queue.shift();
      }
    } finally {
      FireEvents.queue = [];
      FireEvents.delivering = false;
    }
  }

  static addPoint(step: Step & { total: number }, map: EngineMap, mode: DrawingMode) {
    FireEvents.dispatch(map, EVENTS.ADD, {
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

  static movePoint(step: { end: LatLng; id: StepId; start: LatLng; total: number }, map: EngineMap) {
    FireEvents.dispatch(map, EVENTS.MOVE_END, {
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

  static removePoint(step: Step & { total: number }, map: EngineMap) {
    FireEvents.dispatch(map, EVENTS.POINT_REMOVE, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }

  static enterPoint(step: Step & { total: number }, map: EngineMap) {
    FireEvents.dispatch(map, EVENTS.POINTENTER, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }

  static leavePoint(step: Step & { total: number }, map: EngineMap) {
    FireEvents.dispatch(map, EVENTS.POINT_LEAVE, {
      id: step.id,
      coordinates: {
        lat: step.lat,
        lng: step.lng,
      },
      total: step.total,
      timestamp: Date.now(),
    });
  }

  static undo(step: Step & { total: number }, map: EngineMap, originalEvent?: Event) {
    FireEvents.dispatch(map, EVENTS.UNDO, {
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

  static redo(step: Step & { total: number }, map: EngineMap, originalEvent?: Event) {
    FireEvents.dispatch(map, EVENTS.REDO, {
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

  static modeChanged(map: EngineMap, mode: Mode | "break") {
    FireEvents.dispatch(map, EVENTS.MODE_CHANGED, { mode });
  }

  static removeAllPoints(map: EngineMap, originalEvent?: Event) {
    FireEvents.dispatch(map, EVENTS.REMOVE_ALL, { originalEvent });
  }

  static onSaveClick(context: Pick<TilesContext, "map" | "mode">, steps: Step[], originalEvent?: Event) {
    const { map, mode } = context;

    FireEvents.dispatch(map, EVENTS.SAVE, {
      originalEvent,
      timestamp: Date.now(),
      steps,
      mode: {
        geometry: mode.getMode(),
        closedGeometry: mode.getClosedGeometry(),
      },
    });
  }

  static onLineBreak(map: EngineMap) {
    FireEvents.dispatch(map, EVENTS.BREAK, {});
  }

  static onUndoStackChange = (map: EngineMap, length?: number) => {
    FireEvents.dispatch(map, EVENTS.UNDO_STACK_CHANGED, { length: length as number });
  };

  static onRedoStackChange = (map: EngineMap, length?: number) => {
    FireEvents.dispatch(map, EVENTS.REDO_STACK_CHANGED, { length: length as number });
  };
}
