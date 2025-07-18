import type { ListNode, Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { RequiredDrawOptions } from "#app/types";
import type { DrawingMode } from "#components/map/mode";
import type { LatLng } from "#app/types/index";
import type { Command } from "#app/history/command";

interface Snapshot {
  originalHead: ListNode | null;
  originalTail: ListNode | null;
  newHead: ListNode | null;
  newTail: ListNode | null;
  newAuxBetweenHeadTail: ListNode | null;
}

export class BreakGeometryCommand implements Command {
  type: StoreChangeEventKeys = "STORE_BREAK_GEOMETRY";

  private snapshot: Snapshot = {
    originalHead: null,
    originalTail: null,
    newHead: null,
    newTail: null,
    newAuxBetweenHeadTail: null,
  };

  constructor(
    private readonly store: Store,
    private readonly options: RequiredDrawOptions,
    private readonly mode: DrawingMode,
    private readonly current: ListNode,
    private readonly clickCoords: LatLng,
  ) {}

  private makeSnapshot = () => {
    this.snapshot.originalHead = this.store.head;
    this.snapshot.originalTail = this.store.tail;
    this.snapshot.newAuxBetweenHeadTail = this.current.val?.isAuxiliary ? this.current : this.current.next;
  };

  public execute = () => {
    this.makeSnapshot();

    this.store.circular.break(this.current);
    this.mode.setClosedGeometry(false);

    // save the new head and tail after breaking the geometry
    this.snapshot.newHead = this.store.head;
    this.snapshot.newTail = this.store.tail;

    // notify the panel to update the UI
    this.store.notify({ type: "STORE_BREAK_GEOMETRY", data: { coords: this.clickCoords } });
  };

  private restoreOriginalHeadTail = () => {
    const { originalHead, originalTail } = this.snapshot;
    this.store.head = originalHead;
    this.store.tail = originalTail;
    if (this.store.head) {
      this.store.head.prev = this.store.tail;
    }
    if (this.store.tail) {
      this.store.tail.next = this.store.head;
    }
  };

  private restoreAuxBetweenNewHeadTail = () => {
    const { newHead, newTail, newAuxBetweenHeadTail } = this.snapshot;

    if (newHead && newTail) {
      newTail.next = newAuxBetweenHeadTail;
      newAuxBetweenHeadTail!.prev = newTail;
      newAuxBetweenHeadTail!.next = newHead;
      newHead.prev = newAuxBetweenHeadTail;
      if (newAuxBetweenHeadTail?.val) {
        this.store.map.set(newAuxBetweenHeadTail?.val.id, newAuxBetweenHeadTail);
        this.store.size += 1;
      }
    }
  };

  public undo = () => {
    this.restoreOriginalHeadTail();
    this.store.circular.close();
    this.store.notify({ type: "STORE_CLOSE_GEOMETRY" });

    const { newHead, newTail } = this.snapshot;
    // restore old node connections. These are the nodes that were "removed" when breaking the geometry previously
    if (newHead && newTail) {
      if (this.options.pointGeneration === "auto") {
        this.restoreAuxBetweenNewHeadTail();
      } else {
        newTail.next = newHead;
        newHead.prev = newTail;
      }
    }
    this.mode.setClosedGeometry(true);
    // notify the panel to update the UI
    this.store.pingConsumers();
  };
}
