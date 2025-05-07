import { Observable } from "#app/utils/observable";
import type { TimelineChangeEvent } from "./types";

export interface Command {
  type: string;
  payload?: any;
  execute(): void;
  undo(): void;
}

export class Timeline extends Observable<TimelineChangeEvent> {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private static instance: Timeline | null = null;

  static getInstance(): Timeline {
    if (!Timeline.instance) Timeline.instance = new Timeline();
    return Timeline.instance;
  }

  commit = (cmd: Command) => {
    cmd.execute();
    this.undoStack.push({
      execute: cmd.execute,
      undo: cmd.undo,
      type: cmd.type,
      payload: cmd.payload,
    });
    this.redoStack.length = 0;
    this.notify({ type: "REDO_STACK_CHANGED", data: 0 });
  };

  undo = () => {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
    this.notify({ type: "REDO_STACK_CHANGED", data: this.redoStack.length });
    return cmd;
  };

  redo = () => {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    cmd.execute();
    this.undoStack.push(cmd);
    this.notify({ type: "REDO_STACK_CHANGED", data: this.redoStack.length });
    return cmd;
  };
}

export const timeline = Timeline.getInstance();
