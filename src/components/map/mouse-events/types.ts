import { ChangeEvent } from "#app/utils/observable";

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
