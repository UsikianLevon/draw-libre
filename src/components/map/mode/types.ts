import { ChangeEvent } from "#utils/observable";

export type Mode = "line" | "polygon" | null;
interface EventData {
  MODE_CHANGED: Mode;
  BREAK_CHANGED: boolean;
  CLOSED_GEOMETRY_CHANGED: boolean;
}

export type DrawingModeChangeEvent = ChangeEvent<EventData>;
