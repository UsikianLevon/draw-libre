import { StoreChangeEventKeys } from "#app/store/types";
import { LiteralOrCustom } from "#app/types/helpers";

export interface Command {
  type: LiteralOrCustom<StoreChangeEventKeys>;
  payload?: any;
  execute: () => void;
  undo: () => void;
}

export class CompoundCommand implements Command {
  constructor(
    public readonly type: LiteralOrCustom<StoreChangeEventKeys>,
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
