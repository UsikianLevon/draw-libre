import { ChangeEvent } from "#utils/observable";

type MouseEvent =
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

export type MouseEventsChangeEvent = ChangeEvent<Record<MouseEvent, boolean>>;
