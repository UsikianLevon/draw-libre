import type { LatLng, Step, Uuid } from "#types/index";
import type { CustomMap } from "#types/map";
import type { Mode } from "./mode/types";

interface ModeEvent {
  geometry: Mode;
  closedGeometry: boolean;
}

export interface UndoEvent {
  coordinates: LatLng;
  originalEvent: MouseEvent;
  id: Uuid;
  total: number;
  timestamp: number;
  target: CustomMap;
  type: "mdl:undo";
}

export interface RemoveAllEvent {
  originalEvent: MouseEvent;
  type: "mdl:removeall";
  target: CustomMap;
}

export interface SaveEvent {
  originalEvent: MouseEvent;
  timestamp: number;
  steps: Step[];
  mode: ModeEvent;
  target: CustomMap;
  type: "mdl:save";
}

export interface PointDoubleClickEvent {
  id: Uuid;
  total: number;
  timestamp: number;
  target: CustomMap;
  coordinates: LatLng;
  type: "mdl:doubleclick";
}

export interface PointAddEvent {
  id: Uuid;
  total: number;
  timestamp: number;
  target: CustomMap;
  coordinates: LatLng;
  mode: ModeEvent;
  type: "mdl:add";
}

export interface PointMoveEvent {
  start_coordinates: LatLng;
  end_coordinates: LatLng;
  id: Uuid;
  total: number;
  timestamp: number;
  target: CustomMap;
  type: "mdl:moveend";
}

export interface PointEnterEvent {
  coordinates: LatLng;
  id: Uuid;
  total: number;
  timestamp: number;
  target: CustomMap;
  type: "mdl:pointenter";
}

export interface PointLeaveEvent {
  coordinates: LatLng;
  id: Uuid;
  total: number;
  timestamp: number;
  target: CustomMap;
  type: "mdl:pointleave";
}

export interface ModeChangeEvent {
  mode: Mode | "break";
  target: CustomMap;
  type: "mdl:modechanged";
}
