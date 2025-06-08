import type { Command } from "#app/history";
import type { ListNode } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { MapEventsCtx, Step, StepId } from "#app/types";
import { FireEvents } from "#components/map/helpers";
import type { RemoveCommanContext } from ".";
import { PointHelpers } from "../../helpers";

interface RemovedPointSnapshot {
  removedNode: ListNode;
  wasCircular: boolean;
  wasRemovedHead: boolean;
  wasRemovedTail: boolean;
  beforePrimary: ListNode | null;
  afterPrimary: ListNode | null;
  beforeAux: ListNode | null;
  afterAux: ListNode | null;
  newAux: ListNode | null;
}

export class RemovePointAutoCommand implements Command {
  type: StoreChangeEventKeys = "STORE_INBETWEEN_POINT_REMOVED";
  // when we execute(remove) we need to create a new aux point in the place of the removed primary point and its aux points
  snapshot: RemovedPointSnapshot | null = null;

  constructor(private readonly ctx: RemoveCommanContext) {}

  private makeSnapshot(clickedNode: ListNode): RemovedPointSnapshot {
    const { store, nodeId } = this.ctx;
    const wasCircular = store.circular.isCircular();
    const wasRemovedHead = store.head?.val?.id === nodeId;
    const tail = wasCircular ? store.tail?.prev : store.tail;
    const wasRemovedTail = tail?.val?.id === nodeId;

    const auxBefore = clickedNode.prev;
    const auxAfter = clickedNode.next;
    const beforePrimary = clickedNode.prev?.prev ?? null;
    const afterPrimary = clickedNode.next?.next ?? null;

    return {
      removedNode: clickedNode,
      wasCircular,
      wasRemovedHead,
      wasRemovedTail,
      beforePrimary,
      afterPrimary,
      beforeAux: auxBefore,
      afterAux: auxAfter,
      newAux: null,
    };
  }

  public restoreNodeAfter = (after: ListNode, restoredNode: ListNode) => {
    if (!after || !restoredNode || !restoredNode.val) return;

    restoredNode.prev = after;
    restoredNode.next = after.next;

    if (after.next) {
      after.next.prev = restoredNode;
    }

    after.next = restoredNode;

    if (!this.ctx.store.map.has(restoredNode.val.id)) {
      this.ctx.store.map.set(restoredNode.val.id, restoredNode);
      this.ctx.store.size++;
      this.ctx.store.pingConsumers();
    }
  };

  private recalculateInBetweenRemoved(clickedNode: ListNode | null): void {
    if (!clickedNode || !this.snapshot) return;

    const { store } = this.ctx;
    const auxBefore = clickedNode.prev;
    const auxAfter = clickedNode.next;
    const primaryBefore = auxBefore?.prev;
    const primaryAfter = auxAfter?.next;

    if (auxBefore?.val?.isAuxiliary) {
      store.removeNodeById(auxBefore.val.id);
    }

    if (auxAfter?.val?.isAuxiliary) {
      store.removeNodeById(auxAfter.val.id);
    }

    // 5(in a circular and only 3 in a linear) is the minimum number of points needed to add an aux point after removal
    // head -> aux -> primary -> aux -> tail;
    //                   ^
    //                removed
    // head -> aux -> tail;
    //          ^ this needs to be added
    const meetsAuxInsertionThreshold = store.circular.isCircular() ? store.size >= 5 : store.size >= 3;
    if (primaryBefore?.val && primaryAfter?.val && meetsAuxInsertionThreshold) {
      // if we have already undo/redoed then we just insert the new aux point already created
      if (this.snapshot.newAux) {
        this.restoreNodeAfter(primaryBefore, this.snapshot.newAux);
      } else {
        const auxPoint = PointHelpers.createAuxiliaryPoint(primaryBefore.val, primaryAfter.val);
        this.snapshot.newAux = store.insertAfter(primaryBefore, auxPoint);
      }
    }
  }

  private breakGeometryIfNeeded = (ctx: Pick<MapEventsCtx, "store" | "options">): boolean => {
    const { store } = ctx;

    if (store.circular.canBreak() && store.circular.isCircular()) {
      // if the last point is the aux one(we remove the middle point) then we need to
      // remove the aux point and just add a new one between the head and the tail
      if (store.tail?.val?.isAuxiliary) {
        const oldAuxPoint = store.tail;
        store.removeNodeById(store.tail.val.id);
        store.tail = oldAuxPoint?.prev as ListNode;
        const auxPoint = PointHelpers.createAuxiliaryPoint(store.tail?.val as Step, store.head?.val as Step);
        if (this.snapshot) this.snapshot.newAux = store.insertAfter(store.head as ListNode, auxPoint);
      }

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
    const isAuxiliary = clickedNode?.val?.isAuxiliary;
    if (!clickedNode || isAuxiliary) return;

    this.snapshot = this.makeSnapshot(clickedNode);
    this.recalculateInBetweenRemoved(clickedNode);
    // remove the primary node
    this.ctx.store.removeNodeById(this.ctx.nodeId);

    const ok = this.breakGeometryIfNeeded(this.ctx);
    if (ok) {
      this.ctx.mode.reset();
    }

    FireEvents.pointRemoveRightClick({ ...(clickedNode?.val as Step), total: this.ctx.store.size }, this.ctx.map);
    this.ctx.store.pingConsumers();
  };

  private restoreRemovedMiddleNode = (removedNode: ListNode) => {
    if (!this.snapshot) return;
    if (!removedNode.val) return;
    const { beforePrimary: before, afterPrimary: after, wasCircular } = this.snapshot;
    const { store, mode } = this.ctx;

    if (before) {
      before.next = removedNode;
      removedNode.prev = before;
    }

    if (after) {
      removedNode.next = after;
      after.prev = removedNode;
    }

    // this is the case when we have 3 primary and 3 aux points
    if (wasCircular && !this.ctx.store.circular.isCircular()) {
      const auxPoint = PointHelpers.createAuxiliaryPoint(store.tail?.val as Step, store.head?.val as Step);
      store.push(auxPoint);
      store.circular.close();
      mode.setClosedGeometry(true);
    }
  };

  private restoreRemovedHeadNode = (removedNode: ListNode) => {
    if (!this.snapshot || !removedNode?.val) return;

    const { wasCircular } = this.snapshot;
    const { store, mode } = this.ctx;
    const currentHead = this.ctx.store.head;

    if (currentHead) {
      removedNode.next = currentHead;
      currentHead.prev = removedNode;
    }
    store.head = removedNode;

    const notCircularNow = !store.circular.isCircular();
    if (wasCircular && notCircularNow) {
      store.circular.close();
      mode.setClosedGeometry(true);
    }
  };

  private restoreRemovedTailNode = (removedNode: ListNode) => {
    const { store, mode } = this.ctx;
    if (!this.snapshot) return;
    const { wasCircular } = this.snapshot;
    const currentTail = store.tail;

    if (currentTail) {
      currentTail.next = removedNode;
      removedNode.prev = currentTail;
      store.tail = removedNode;
    }
    const notCircularNow = !store.circular.isCircular();
    if (wasCircular && notCircularNow) {
      store.circular.close();
      mode.setClosedGeometry(true);
    }
  };

  private restoreAuxiliaryPoints(node: ListNode): void {
    if (!this.snapshot) return;
    if (node.prev?.val && node.val && this.snapshot?.beforeAux) {
      this.restoreNodeAfter(node.prev, this.snapshot?.beforeAux);
      if (this.snapshot.wasRemovedHead && this.snapshot.wasCircular) {
        this.ctx.store.tail = this.snapshot.beforeAux;
      }
    }

    if (node.next?.val && node.val && this.snapshot?.afterAux) {
      this.restoreNodeAfter(node, this.snapshot?.afterAux);
      if (this.snapshot.wasRemovedTail && this.snapshot.wasCircular) {
        this.ctx.store.tail = this.snapshot.afterAux;
      }
    }

    if (this.snapshot.wasCircular) {
      this.ctx.store.circular.close();
    }
  }

  public undo = () => {
    const { store } = this.ctx;

    if (!this.snapshot) return;
    const { removedNode: node, wasRemovedHead, wasRemovedTail, wasCircular } = this.snapshot;
    if (!node?.val) return;

    if (wasRemovedHead) {
      // first remove the aux point that was added before when we removed the primary node
      store.removeNodeById(store.head?.prev?.val?.id as StepId);
      this.restoreRemovedHeadNode(node);
    } else if (wasRemovedTail) {
      this.restoreRemovedTailNode(node);
      if (wasCircular && store.tail?.prev?.val?.isAuxiliary) {
        store.removeNodeById(store.tail?.prev?.val?.id as StepId);
      }
    } else {
      // first remove the aux point that was added before when we removed the primary node
      if (this.snapshot.newAux?.val?.id) {
        store.removeNodeById(this.snapshot.newAux?.val?.id);
      }
      this.restoreRemovedMiddleNode(node);
    }

    if (!store.map.has(this.ctx.nodeId)) {
      store.map.set(this.ctx.nodeId, node);
      store.size++;
    }

    this.restoreAuxiliaryPoints(node);
    store.pingConsumers();
  };
}
