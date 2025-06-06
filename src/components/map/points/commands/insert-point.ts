import { Command } from "#app/history";
import { ListNode, Store } from "#app/store";
import type { LatLng, Step } from "#app/types";
import { uuidv4 } from "#app/utils/helpers";

interface Snapshot {
  insertedNode: ListNode | null;
}

export class InsertPointCommand implements Command {
  type: string = "STORE_POINT_INSERTED";
  payload: { node: Step };
  private readonly step: Step;
  private snapshot: Snapshot = {
    insertedNode: null,
  };

  constructor(
    private readonly store: Store,
    coords: LatLng,
    private segmentStart: ListNode,
  ) {
    this.step = { id: uuidv4(), isAuxiliary: false, ...coords };
    this.payload = { node: this.step };
  }

  private restoreInsertedNode = (node: ListNode) => {
    const prev = node.prev;
    const next = node.next;

    if (prev) {
      prev.next = node;
    } else {
      this.store.head = node;
    }

    if (next) {
      next.prev = node;
    } else {
      this.store.tail = node;
    }

    const betweenHeadAndTail = this.store.tail === prev && this.store.head === next;
    if (betweenHeadAndTail) {
      this.store.tail = node;
      if (this.store.head) this.store.head.prev = node;
    }

    if (node.val && !this.store.map.has(node.val.id)) {
      this.store.map.set(node.val.id, node);
      this.store.size++;
      this.store.pingConsumers();
    }
  };

  execute = () => {
    if (this.snapshot.insertedNode) {
      this.restoreInsertedNode(this.snapshot.insertedNode);
    } else {
      this.snapshot.insertedNode = this.store.insertAfter(this.segmentStart, this.step);
    }

    this.store.notify({ type: "STORE_POINT_INSERTED" });
  };

  undo = () => {
    this.store.removeNodeById(this.step.id);
  };
}
