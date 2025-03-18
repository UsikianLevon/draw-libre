import type { LatLng, Step, Uuid } from "#types/index";
import type { Map } from "#types/map";
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
  target: Map;
  type: "mdl:undo";
}

export interface RemoveAllEvent {
  originalEvent: MouseEvent;
  type: "mdl:removeall";
  target: Map;
}

export interface SaveEvent {
  originalEvent: MouseEvent;
  timestamp: number;
  steps: Step[];
  mode: ModeEvent;
  target: Map;
  type: "mdl:save";
}

export interface PointDoubleClickEvent {
  id: Uuid;
  total: number;
  timestamp: number;
  target: Map;
  coordinates: LatLng;
  type: "mdl:doubleclick";
}

export interface PointAddEvent {
  id: Uuid;
  total: number;
  timestamp: number;
  target: Map;
  coordinates: LatLng;
  mode: ModeEvent;
  type: "mdl:add";
}

export interface PointMoveEvent  {
  start_coordinates: LatLng;
  end_coordinates: LatLng;
  id: Uuid;
  total: number;
  timestamp: number;
  target: Map;
  type: "mdl:moveend";
}

export interface PointEnterEvent {
  coordinates: LatLng;
  id: Uuid;
  total: number;
  timestamp: number;
  target: Map;
  type: "mdl:pointenter";
}

export interface PointLeaveEvent {
  coordinates: LatLng;
  id: Uuid;
  total: number;
  timestamp: number;
  target: Map;
  type: "mdl:pointleave";
}

export interface ModeChangeEvent {
  mode: Mode | "break";
  target: Map;
  type: "mdl:modechanged";
}
