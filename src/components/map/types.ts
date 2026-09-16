import type { LatLng, Step, StepId } from "#app/types/index";
import type { MapLike } from "#app/types/map";
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
  target: MapLike;
}

interface HistoryEvent {
  originalEvent?: Event;
  id?: StepId;
  coordinates?: LatLng;
  total: number;
  timestamp: number;
  target: MapLike;
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
  target: MapLike;
}

export interface SaveEvent {
  originalEvent?: Event;
  timestamp: number;
  steps: Step[];
  mode: ModeEvent;
  target: MapLike;
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
  target: MapLike;
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
  target: MapLike;
  type: "mdl:modechanged";
}

export interface UndoStackChangeEvent {
  length: number;
  target: MapLike;
  type: "mdl:undostackchanged";
}

export interface RedoStackChangeEvent {
  length: number;
  target: MapLike;
  type: "mdl:redostackchanged";
}

export interface BreakEvent {
  target: MapLike;
  type: "mdl:break";
}

export type DrawLibreEventType = {
  "mdl:add": PointAddEvent;
  "mdl:pointremove": PointRemoveEvent;
  "mdl:pointenter": PointEnterEvent;
  "mdl:pointleave": PointLeaveEvent;
  "mdl:moveend": PointMoveEvent;
  "mdl:undo": UndoEvent;
  "mdl:redo": RedoEvent;
  "mdl:removeall": RemoveAllEvent;
  "mdl:save": SaveEvent;
  "mdl:break": BreakEvent;
  "mdl:modechanged": ModeChangeEvent;
  "mdl:undostackchanged": UndoStackChangeEvent;
  "mdl:redostackchanged": RedoStackChangeEvent;
};
