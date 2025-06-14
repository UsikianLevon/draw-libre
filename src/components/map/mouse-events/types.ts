import { ChangeEvent } from "#app/observable";

export type MapMouseEvent =
  | "firstPointMouseEnter"
  | "firstPointMouseLeave"
  | "lastPointMouseClick"
  | "lastPointMouseUp"
  | "lastPointMouseEnter"
  | "lastPointMouseLeave"
  | "pointMouseDown"
  | "pointMouseUp"
  | "pointMouseEnter"
  | "pointMouseLeave"
  | "lineMouseEnter"
  | "lineMouseLeave";

export type MouseEventsChangeEvent = ChangeEvent<Record<MapMouseEvent, boolean>>;
