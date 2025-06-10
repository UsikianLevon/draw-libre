import { Observable } from "#app/utils/observable";
import { type Command, CompoundCommand } from "./command";
import type { TimelineChangeEvent } from "./types";

export class Timeline extends Observable<TimelineChangeEvent> {
  private transaction: CompoundCommand | null = null;
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  private static instance: Timeline | null = null;

  static getInstance(): Timeline {
    if (!Timeline.instance) Timeline.instance = new Timeline();
    return Timeline.instance;
  }

  public commit = (cmd: Command) => {
    cmd.execute();
    if (this.transaction) {
      this.transaction.add(cmd);
    } else {
      this.undoStack.push(cmd);
    }

    this.redoStack.length = 0;
    this.pingConsumers();
  };

  public undo = () => {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
    this.pingConsumers();
    return cmd;
  };

  public redo = () => {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    cmd.execute();
    this.undoStack.push(cmd);
    this.pingConsumers();
    return cmd;
  };

  public beginTransaction = (type: string = "compound", payload: any = null) => {
    if (this.transaction) return;
    this.transaction = new CompoundCommand(type, payload);
  };

  public commitTransaction = () => {
    if (!this.transaction) return;
    const txn = this.transaction;
    this.transaction = null;

    this.undoStack.push(txn);
    this.pingConsumers();
  };

  public getRedoStackLength = () => {
    return this.redoStack.length;
  };

  public getUndoStackLength = () => {
    return this.undoStack.length;
  };

  public resetStacks = () => {
    this.undoStack = [];
    this.redoStack = [];
    this.notify({ type: "REDO_STACK_CHANGED", data: 0 });
  };

  pingConsumers = () => {
    this.notify({
      type: "REDO_STACK_CHANGED",
      data: this.redoStack.length,
    });

    this.notify({
      type: "UNDO_STACK_CHANGED",
      data: this.undoStack.length,
    });
  };
}

export const timeline = Timeline.getInstance();
