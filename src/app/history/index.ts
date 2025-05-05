import { Observable } from "#app/utils/observable";
import type { HistoryChangeEvent } from "./types";

export interface Command {
    type: string;
    payload?: any;
    execute(): void;
    undo(): void;
}

export class History extends Observable<HistoryChangeEvent> {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private static instance: History | null = null;

    static getInstance(): History {
        if (!History.instance) History.instance = new History();
        return History.instance;
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
        console.log("undoStack");

        this.notify({ type: "REDO_STACK_CHANGED", data: 0 });
    }

    undo = () => {
        const cmd = this.undoStack.pop();
        if (!cmd) return;
        cmd.undo();
        this.redoStack.push(cmd);
        console.log("undoStack2",);

        this.notify({ type: "REDO_STACK_CHANGED", data: this.redoStack.length });
        return cmd
    }

    redo = () => {
        const cmd = this.redoStack.pop();
        if (!cmd) return null;
        cmd.execute();
        this.undoStack.push(cmd);
        console.log("undoStack3",);

        this.notify({ type: "REDO_STACK_CHANGED", data: this.redoStack.length });
        return cmd
    }
}

export const timeline = History.getInstance();
