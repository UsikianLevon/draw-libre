import type { Command } from "#app/history";
import type { Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { RequiredDrawOptions } from "#app/types";
import type { UnifiedMap } from "#app/types/map";
import type { DrawingMode } from "#components/map/mode";
import { RemovePointAutoCommand } from "./auto";
import { RemovePointManualCommand } from "./manual";

export interface RemoveCommanContext {
  readonly store: Store;
  readonly map: UnifiedMap;
  readonly options: RequiredDrawOptions;
  readonly mode: DrawingMode;
  readonly nodeId: string;
}

export class RemovePointCommand implements Command {
  type: StoreChangeEventKeys = "STORE_INBETWEEN_POINT_REMOVED";
  manualPointRemove: RemovePointManualCommand | null = null;
  autoPointRemove: RemovePointAutoCommand | null = null;
  constructor(private readonly ctx: RemoveCommanContext) {
    this.manualPointRemove = new RemovePointManualCommand(this.ctx);
    this.autoPointRemove = new RemovePointAutoCommand(this.ctx);
  }

  public execute = () => {
    if (this.ctx.options.pointGeneration === "auto") {
      this.autoPointRemove?.execute();
    } else {
      this.manualPointRemove?.execute();
    }
  };

  public undo = () => {
    if (this.ctx.options.pointGeneration === "auto") {
      this.autoPointRemove?.undo();
    } else {
      this.manualPointRemove?.undo();
    }
  };
}
