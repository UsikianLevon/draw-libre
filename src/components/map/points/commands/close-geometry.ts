import type { Command } from "#app/history";
import { Store } from "#app/store";
import type { RequiredDrawOptions, StepId } from "#app/types";
import type { DrawingMode } from "#components/map/mode";

export class CloseGeometryCommand implements Command {
  type: string;

  constructor(
    private readonly store: Store,
    private readonly mode: DrawingMode,
    private readonly options: RequiredDrawOptions,
  ) {
    this.type = "STORE_CLOSE_GEOMETRY";
  }

  public execute = () => {
    // adding auxPoint as the tail
    this.store.notify({ type: "STORE_CLOSE_GEOMETRY" });
    // closing the geometry
    if (this.store.tail?.val && this.store.head?.val) {
      this.store.tail.next = this.store.head;
      this.store.head.prev = this.store.tail;
    }
    this.mode.setClosedGeometry(true);
  };

  public undo = () => {
    if (this.options.pointGeneration === "auto") {
      this.store.removeNodeById(this.store.tail?.val?.id as StepId);
    }
    if (this.store.tail?.val && this.store.head?.val) {
      this.store.tail.next = null;
      this.store.head.prev = null;
    }
    this.mode.setClosedGeometry(false);
  };
}
