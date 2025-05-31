import type { Command } from "#app/history";
import type { ListNode, Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { RequiredDrawOptions, Step, StepId } from "#app/types";
import type { DrawingMode } from "#components/map/mode";
import { PointHelpers } from "../helpers";

export class CloseGeometryCommand implements Command {
  type: StoreChangeEventKeys = "STORE_CLOSE_GEOMETRY";
  auxPointSnapshot: ListNode | null = null;

  constructor(
    private readonly store: Store,
    private readonly mode: DrawingMode,
    private readonly options: RequiredDrawOptions,
  ) {
    this.type = "STORE_CLOSE_GEOMETRY";
  }

  private restoreAuxPoint = () => {
    if (this.auxPointSnapshot?.val) {
      this.store.head!.prev = this.auxPointSnapshot;
      this.store.tail!.next = this.auxPointSnapshot;
      this.auxPointSnapshot.prev = this.store.tail;
      this.auxPointSnapshot.next = this.store.head;
      this.store.tail = this.auxPointSnapshot;
      this.store.map.set(this.auxPointSnapshot.val.id, this.auxPointSnapshot);
      this.store.size++;
      this.store.pingConsumers();
    }
  };

  public execute = () => {
    // adding aux point as the tail before closing the geometry
    if (this.options.pointGeneration === "auto" && this.store.tail?.val) {
      if (this.auxPointSnapshot) {
        this.restoreAuxPoint();
      } else {
        const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail?.val, this.store.head?.val as Step);
        this.auxPointSnapshot = this.store.push(auxPoint);
      }
    }
    this.store.circular.close();
    this.mode.setClosedGeometry(true);
    this.store.notify({ type: this.type });
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
    this.store.notify({ type: "STORE_BREAK_GEOMETRY" });
  };
}
