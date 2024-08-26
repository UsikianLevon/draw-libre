import type { LatLng, Step, Uuid } from "#types/index";
import type { Map } from "#types/map";
import type { Mode } from "./mode/types";

interface BaseEvent {
  id: Uuid;
  total: number;
  timestamp: number;
  target: Map;
}

interface ModeEvent {
  geometry: Mode;
  closedGeometry: boolean;
}

export interface UndoEvent extends BaseEvent {
  coordinates: LatLng;
  originalEvent: MouseEvent;
}

export interface RemoveAllEvent {
  originalEvent: MouseEvent;
}

export interface SaveEvent {
  originalEvent: MouseEvent;
  timestamp: number;
  steps: Step[];
  mode: ModeEvent;
}

export interface PointDoubleClickEvent extends BaseEvent {
  coordinates: LatLng;
}

export interface PointAddEvent extends BaseEvent {
  coordinates: LatLng;
  mode: ModeEvent;
}

export interface PointMoveEvent extends BaseEvent {
  start_coordinates: LatLng;
  end_coordinates: LatLng;
}

export interface PointEnterEvent extends BaseEvent {
  coordinates: LatLng;
}

export interface PointLeaveEvent extends BaseEvent {
  coordinates: LatLng;
}

export interface ModeChangeEvent {
  mode: ModeEvent;
}
