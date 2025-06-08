import { ChangeEvent } from "#app/utils/observable";

interface EventData {
  REDO_STACK_CHANGED: number;
  UNDO_STACK_CHANGED: number;
}

export type TimelineChangeEvent = ChangeEvent<EventData>;
