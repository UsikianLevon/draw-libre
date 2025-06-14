import type { Command } from "#app/history/command";
import type { ListNode } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { Step } from "#app/types";
import { FireEvents } from "#components/map/fire-events";
import type { RemoveCommanContext } from ".";

interface RemovedPointSnapshot {
  removedNode: ListNode;
  wasCircular: boolean;
  wasRemovedHead: boolean;
  wasRemovedTail: boolean;
}

export class RemovePointManualCommand implements Command {
  type: StoreChangeEventKeys = "STORE_INBETWEEN_POINT_REMOVED";
  snapshot: RemovedPointSnapshot | null = null;

  constructor(private readonly ctx: RemoveCommanContext) {}

  private makeSnapshot(clickedNode: ListNode): RemovedPointSnapshot {
    const wasRemovedHead = this.ctx.store.head?.val?.id === this.ctx.nodeId;
    const wasRemovedTail = this.ctx.store.tail?.val?.id === this.ctx.nodeId;
    const wasCircular = this.ctx.store.circular.isCircular();

    return {
      removedNode: clickedNode,
      wasCircular,
      wasRemovedHead,
      wasRemovedTail,
    };
  }

  private breakGeometryIfNeeded = (ctx: Pick<RemoveCommanContext, "store">) => {
    const { store } = ctx;

    if (store.circular.canBreak() && store.circular.isCircular()) {
      if (store.head) {
        store.head.prev = null;
      }
      if (store.tail) {
        store.tail.next = null;
      }

      return true;
    }
    return false;
  };

  public execute = () => {
    const clickedNode = this.ctx.store.findNodeById(this.ctx.nodeId);

    if (!clickedNode?.val) return;

    this.snapshot = this.makeSnapshot(clickedNode);
    this.ctx.store.removeNodeById(this.ctx.nodeId);
    const ok = this.breakGeometryIfNeeded(this.ctx);
    if (ok) {
      this.ctx.mode.reset();
    }
    FireEvents.pointRemoveRightClick({ ...(clickedNode?.val as Step), total: this.ctx.store.size }, this.ctx.map);
    this.ctx.store.pingConsumers();
  };

  private closeGeometryIfNeeded = () => {
    const { store, mode } = this.ctx;

    const notCircularNow = !this.ctx.store.circular.isCircular();
    if (this.snapshot?.wasCircular && notCircularNow) {
      store.circular.close();
      mode.setClosedGeometry(true);
    }
  };

  private restoreRemovedMiddleNode = (removedNode: ListNode) => {
    if (!removedNode?.val) return;

    const { prev, next } = removedNode;

    if (prev) {
      prev.next = removedNode;
      removedNode.prev = prev;
    } else {
      this.ctx.store.head = removedNode;
    }

    if (next) {
      next.prev = removedNode;
      removedNode.next = next;
    } else {
      this.ctx.store.tail = removedNode;
    }
  };

  private restoreRemovedHeadNode = (removedNode: ListNode) => {
    const currentHead = this.ctx.store.head;
    if (!removedNode?.val) return;

    if (currentHead) {
      removedNode.next = currentHead;
      currentHead.prev = removedNode;
    }
    this.ctx.store.head = removedNode;
  };

  private restoreRemovedTailNode = (removedNode: ListNode) => {
    const currentTail = this.ctx.store.tail;

    if (currentTail) {
      currentTail.next = removedNode;
      removedNode.prev = currentTail;
    }
    this.ctx.store.tail = removedNode;
  };

  public undo = () => {
    if (!this.snapshot) return;
    const { removedNode, wasRemovedHead, wasRemovedTail } = this.snapshot;

    if (wasRemovedHead) {
      this.restoreRemovedHeadNode(removedNode);
    } else if (wasRemovedTail) {
      this.restoreRemovedTailNode(removedNode);
    } else {
      this.restoreRemovedMiddleNode(removedNode);
    }

    this.closeGeometryIfNeeded();

    if (!this.ctx.store.map.has(this.ctx.nodeId)) {
      this.ctx.store.map.set(this.ctx.nodeId, removedNode);
      this.ctx.store.size++;
    }

    this.ctx.store.pingConsumers();
  };
}
