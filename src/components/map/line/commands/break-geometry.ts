import { Command } from "#app/history";
import { ListNode, Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { RequiredDrawOptions, Step } from "#app/types";
import { Spatial } from "#app/utils/helpers";
import type { DrawingMode } from "#components/map/mode";
import { PointHelpers } from "#components/map/points/helpers";

export class BreakGeometryCommand implements Command {
  type: StoreChangeEventKeys = "STORE_BREAK_GEOMETRY";
  private originalHead: ListNode | null = null;
  private originalTail: ListNode | null = null;
  private newHead: ListNode | null = null;
  private newTail: ListNode | null = null;

  constructor(
    private readonly store: Store,
    private readonly options: RequiredDrawOptions,
    private readonly mode: DrawingMode,
    private readonly current: ListNode,
  ) { }

  public execute = () => {

    // save the original head and tail before breaking the geometry so we can restore them later if undo is called
    this.originalHead = this.store.head;
    this.originalTail = this.store.tail;

    // break the geometry
    Spatial.breakGeometry(this.store, this.options, this.current);
    this.mode.setClosedGeometry(false);
    this.store.notify({ type: this.type });

    // save the new head and tail after breaking the geometry
    this.newHead = this.store.head;
    this.newTail = this.store.tail;

    // notify the panel to update the UI
    this.store.notify({ type: "STORE_MUTATED", data: { head: this.store.head, tail: this.store.tail, size: this.store.size } });
  };

  public undo = () => {
    // restore the original head and tail
    this.store.head = this.originalHead;
    // if pointGeneration is "auto" then the tail is the prev of the originalTail, because of the auxPoint
    this.store.tail = this.options.pointGeneration === "auto" ? this.originalTail?.prev as ListNode : this.originalTail;

    // adding auxPoint as the tail
    this.store.notify({ type: "STORE_CLOSE_GEOMETRY" });
    // close the geometry
    if (this.store.tail && this.store.head) {
      this.store.tail.next = this.store.head;
      this.store.head.prev = this.store.tail;
    }

    // restore old node connections. These are the nodes that were "removed" when breaking the geometry previously
    if (this.newHead && this.newTail) {
      if (this.options.pointGeneration === "auto") {
        const auxPoint = PointHelpers.createAuxiliaryPoint(this.newTail?.val as Step, this.newHead?.val as Step);
        const auxNode = new ListNode(auxPoint);
        this.newTail.next = auxNode;
        auxNode.prev = this.newTail;
        auxNode.next = this.newHead;
        this.newHead.prev = auxNode;
      } else {
        this.newTail.next = this.newHead;
        this.newHead.prev = this.newTail;
      }
    }
    this.mode.setClosedGeometry(true);
    // notify the panel to update the UI
    this.store.notify({ type: "STORE_MUTATED", data: { head: this.store.head, tail: this.store.tail, size: this.store.size } });
  };
}
