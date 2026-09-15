import type { LatLng, Step, StepId } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";
import type { Mode } from "./mode/types";

interface ModeEvent {
  geometry: Mode;
  closedGeometry: boolean;
}

interface StepEvent {
  id: StepId;
  coordinates: LatLng;
  total: number;
  timestamp: number;
  target: UnifiedMap;
}

interface HistoryEvent {
  originalEvent?: Event;
  id?: StepId;
  coordinates?: LatLng;
  total: number;
  timestamp: number;
  target: UnifiedMap;
}

export interface UndoEvent extends HistoryEvent {
  type: "mdl:undo";
}

export interface RedoEvent extends HistoryEvent {
  type: "mdl:redo";
}

export interface RemoveAllEvent {
  originalEvent?: Event;
  type: "mdl:removeall";
  target: UnifiedMap;
}

export interface SaveEvent {
  originalEvent?: Event;
  timestamp: number;
  steps: Step[];
  mode: ModeEvent;
  target: UnifiedMap;
  type: "mdl:save";
}

export interface PointRemoveEvent extends StepEvent {
  type: "mdl:pointremove";
}

export interface PointAddEvent extends StepEvent {
  mode: ModeEvent;
  type: "mdl:add";
}

export interface PointMoveEvent {
  start_coordinates: LatLng;
  end_coordinates: LatLng;
  id: StepId;
  total: number;
  timestamp: number;
  target: UnifiedMap;
  type: "mdl:moveend";
}

export interface PointEnterEvent extends StepEvent {
  type: "mdl:pointenter";
}

export interface PointLeaveEvent extends StepEvent {
  type: "mdl:pointleave";
}

export interface ModeChangeEvent {
  mode: Mode | "break";
  target: UnifiedMap;
  type: "mdl:modechanged";
}

export interface UndoStackChangeEvent {
  length: number;
  target: UnifiedMap;
  type: "mdl:undostackchanged";
}

export interface RedoStackChangeEvent {
  length: number;
  target: UnifiedMap;
  type: "mdl:redostackchanged";
}

export interface BreakEvent {
  target: UnifiedMap;
  type: "mdl:break";
}
