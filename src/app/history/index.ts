export interface Command {
    type: string;
    payload?: any;
    execute(): void;
    undo(): void;
}

export class History {
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
    }

    undo = () => {
        const cmd = this.undoStack.pop();
        if (!cmd) return;
        cmd.undo();
        this.redoStack.push(cmd);
        return cmd
    }

    redo = () => {
        const cmd = this.redoStack.pop();
        if (!cmd) return null;
        cmd.execute();
        this.undoStack.push(cmd);
        return cmd
    }
}

export const timeline = History.getInstance();
