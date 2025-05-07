import { Command } from "#app/history";
import type { ListNode, Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { RequiredDrawOptions } from "#app/types";
import { Spatial } from "#app/utils/helpers";
import type { DrawingMode } from "#components/map/mode";

export class BreakGeometryCommand implements Command {
  type: StoreChangeEventKeys;

  constructor(
    private readonly store: Store,
    private readonly options: RequiredDrawOptions,
    private readonly mode: DrawingMode,
    private readonly current: ListNode,
  ) {
    this.type = "STORE_BREAK_GEOMETRY";
  }

  execute = () => {
    Spatial.breakGeometry(this.store, this.options, this.current);
    this.mode.setClosedGeometry(false);
    this.store.notify({ type: this.type });
  };

  undo = () => {
    // adding auxPoint as the tail
    this.store.notify({ type: "STORE_CLOSE_GEOMETRY" });
    // close the geometry
    if (this.store.tail && this.store.head) {
      this.store.tail.next = this.store.head;
      this.store.head.prev = this.store.tail;
    }

    this.mode.setClosedGeometry(true);
  };
}
