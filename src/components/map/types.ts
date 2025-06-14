import type { LatLng, Step, Uuid } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";
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
  target: UnifiedMap;
  type: "mdl:undo";
}

export interface RemoveAllEvent {
  originalEvent: MouseEvent;
  type: "mdl:removeall";
  target: UnifiedMap;
}

export interface SaveEvent {
  originalEvent: MouseEvent;
  timestamp: number;
  steps: Step[];
  mode: ModeEvent;
  target: UnifiedMap;
  type: "mdl:save";
}

export interface PointRightClickRemoveEvent {
  id: Uuid;
  total: number;
  timestamp: number;
  target: UnifiedMap;
  coordinates: LatLng;
  type: "mdl:rightclickremove";
}

export interface PointAddEvent {
  id: Uuid;
  total: number;
  timestamp: number;
  target: UnifiedMap;
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
  target: UnifiedMap;
  type: "mdl:moveend";
}

export interface PointEnterEvent {
  coordinates: LatLng;
  id: Uuid;
  total: number;
  timestamp: number;
  target: UnifiedMap;
  type: "mdl:pointenter";
}

export interface PointLeaveEvent {
  coordinates: LatLng;
  id: Uuid;
  total: number;
  timestamp: number;
  target: UnifiedMap;
  type: "mdl:pointleave";
}

export interface ModeChangeEvent {
  mode: Mode | "break";
  target: UnifiedMap;
  type: "mdl:modechanged";
}

export interface UndoStackChangeEvent {
  mode: Mode | "break";
  target: UnifiedMap;
  type: "mdl:undostackchanged";
}

export interface RedoStackChangeEvent {
  mode: Mode | "break";
  target: UnifiedMap;
  type: "mdl:redostackchanged";
}
