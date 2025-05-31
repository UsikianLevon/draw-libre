import { Observable } from "#app/utils/observable";
import type { TimelineChangeEvent } from "./types";

export interface Command {
  type: string;
  payload?: any;
  execute(): void;
  undo(): void;
}

export class CompoundCommand implements Command {
  constructor(
    public readonly type: string,
    public readonly payload: any,
    private commands: Command[] = [],
  ) {}

  add(cmd: Command) {
    this.commands.push(cmd);
  }

  execute() {
    if (!this.commands) return;

    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo() {
    if (!this.commands) return;

    for (let i = this.commands.length - 1; i >= 0; i--) {
      const command = this.commands[i];
      command?.undo();
    }
  }
}

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
    this.notify({ type: "REDO_STACK_CHANGED", data: 0 });
    console.log("Timeline commit", cmd.type, this.undoStack, this.redoStack);
  };

  public undo = () => {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
    this.notify({ type: "REDO_STACK_CHANGED", data: this.redoStack.length });
    return cmd;
  };

  public redo = () => {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    cmd.execute();
    this.undoStack.push(cmd);
    this.notify({ type: "REDO_STACK_CHANGED", data: this.redoStack.length });
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
    this.notify({ type: "REDO_STACK_CHANGED", data: this.redoStack.length });
  };

  public getRedoStackLength = () => {
    return this.redoStack.length;
  };

  public getUndoStackLength = () => {
    return this.undoStack;
  };

  public resetStacks = () => {
    this.undoStack = [];
    this.redoStack = [];
    this.notify({ type: "REDO_STACK_CHANGED", data: 0 });
  };
}

export const timeline = Timeline.getInstance();
