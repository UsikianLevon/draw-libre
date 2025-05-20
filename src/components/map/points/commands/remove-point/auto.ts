import type { Command } from "#app/history";
import type { ListNode } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { EventsCtx, Step, StepId } from "#app/types";
import { Spatial } from "#app/utils/helpers";
import { FireEvents } from "#components/map/helpers";
import type { RemoveCommanContext } from ".";
import { PointHelpers } from "../../helpers";

export class RemovePointAutoCommand implements Command {
    type: StoreChangeEventKeys = "STORE_INBETWEEN_POINT_REMOVED"
    removedNode: ListNode | null = null;
    wasRemovedHead: boolean = false;
    wasRemovedTail: boolean = false;
    beforePrimary: ListNode | null = null;
    afterPrimary: ListNode | null = null;
    wasCircular: boolean = false;
    executedAuxId: StepId | null = null // when we execute we need to create an aux point in the place of the removed one
    id: string = ""

    constructor(
        private readonly ctx: RemoveCommanContext,
    ) { }

    public execute = () => {
        const clickedNode = this.ctx.store.findNodeById(this.ctx.nodeId);
        const isAuxiliary = clickedNode?.val?.isAuxiliary;

        if (!clickedNode || isAuxiliary) return;

        this.removedNode = clickedNode;

        this.wasCircular = this.ctx.store.isCircular();
        this.wasRemovedHead = this.ctx.store.head?.val?.id === this.ctx.nodeId;
        const tail = this.wasCircular ? this.ctx.store.tail?.prev : this.ctx.store.tail
        this.wasRemovedTail = tail?.val?.id === this.ctx.nodeId;
        if (this.removedNode.prev?.prev) {
            this.beforePrimary = this.removedNode.prev?.prev;
        }
        if (this.removedNode.next?.next) {
            this.afterPrimary = this.removedNode.next?.next;
        }

        // remove 2 aux points inbetween the primary node that will be removed
        this.recalculateInBetweenRemoved(clickedNode);

        // remove the primary node
        this.ctx.store.removeNodeById(this.ctx.nodeId);

        const [ok, id] = this.switchToLineModeIfCan(this.ctx);
        if (ok) {
            this.ctx.mode.reset();
            this.executedAuxId = id;
        }

        FireEvents.pointRemoveRightClick({ ...(clickedNode?.val as Step), total: this.ctx.store.size }, this.ctx.map);
        this.ctx.store.pingConsumers();
    };

    private recalculateInBetweenRemoved(clickedNode: ListNode | null): void {
        if (!clickedNode) return;

        const auxBefore = clickedNode.prev;
        const auxAfter = clickedNode.next;
        const primaryBefore = auxBefore?.prev;
        const primaryAfter = auxAfter?.next;

        if (auxBefore?.val?.isAuxiliary) {
            console.log("remove auxBefore", auxBefore.val.id);

            this.ctx.store.removeNodeById(auxBefore.val.id);
        }

        if (auxAfter?.val?.isAuxiliary) {
            this.ctx.store.removeNodeById(auxAfter.val.id);
        }

        // 5(in a circular and only 3 in a linear) is the minimum number of points needed to add an aux point after removal 
        // head -> aux -> primary -> aux -> tail;
        //                   ^
        //                removed
        // head -> aux -> tail; 
        //          ^ this needs to be added
        const meetsAuxInsertionThreshold = this.ctx.store.isCircular() ? this.ctx.store.size >= 5 : this.ctx.store.size >= 3;
        if (primaryBefore?.val && primaryAfter?.val && meetsAuxInsertionThreshold) {
            const auxPoint = PointHelpers.createAuxiliaryPoint(primaryBefore.val, primaryAfter.val);
            this.ctx.store.insert(auxPoint, primaryBefore);
        }
    }

    private restoreRemovedMiddleNode = (removedNode: ListNode) => {
        if (!removedNode.val) return;

        const before = this.beforePrimary
        const after = this.afterPrimary

        if (before) {
            before.next = removedNode;
            removedNode.prev = before;
        }

        if (after) {
            removedNode.next = after;
            after.prev = removedNode;
        }

        if (this.wasCircular && !this.ctx.store.isCircular()) {
            const auxPoint = PointHelpers.createAuxiliaryPoint(this.ctx.store.tail?.val as Step, this.ctx.store.head?.val as Step);
            this.ctx.store.push(auxPoint);
            const head = this.ctx.store.head!;
            const tail = this.ctx.store.tail!;
            tail.next = head;
            head.prev = tail;
            this.ctx.mode.setClosedGeometry(true);
        }
    }


    private restoreRemovedHeadNode = (removedNode: ListNode) => {
        const currentHead = this.ctx.store.head;
        if (!removedNode?.val) return;

        if (currentHead) {
            removedNode.next = currentHead;
            currentHead.prev = removedNode;
        }
        this.ctx.store.head = removedNode;

        const notCircularNow = !this.ctx.store.isCircular();
        if (this.wasCircular && notCircularNow) {
            this.ctx.store.tail!.next = this.ctx.store.head;
            this.ctx.store.head.prev = this.ctx.store.tail;
            this.ctx.mode.setClosedGeometry(true);
        }
    }

    private restoreRemovedTailNode = (removedNode: ListNode) => {
        const currentTail = this.ctx.store.tail;

        if (currentTail) {
            currentTail.next = removedNode;
            removedNode.prev = currentTail;
            this.ctx.store.tail = removedNode;
        }
        const notCircularNow = !this.ctx.store.isCircular();
        if (this.wasCircular && notCircularNow) {
            removedNode.next = this.ctx.store.head;
            this.ctx.store.head!.prev = removedNode;
            this.ctx.mode.setClosedGeometry(true);
        }
    }

    private switchToLineModeIfCan = (ctx: Pick<EventsCtx, "store" | "options">): [boolean, StepId | null] => {
        const { store, options } = ctx;

        const canBreakGeometry = Spatial.canBreakClosedGeometry(store, options);

        if (canBreakGeometry && store.isCircular()) {
            let id = null;
            // if the last point is the aux one(we remove the middle point) then we need to 
            // remove the aux point and just add a new one between the head and the tail
            if (store.tail?.val?.isAuxiliary) {
                const oldAuxPoint = store.tail;
                store.removeNodeById(store.tail.val.id);
                store.tail = oldAuxPoint?.prev as ListNode;
                const auxPoint = PointHelpers.createAuxiliaryPoint(store.tail?.val as Step, store.head?.val as Step);
                store.insert(auxPoint, store.head as ListNode);
                id = auxPoint.id;
            }

            if (store.head) {
                store.head.prev = null;
            }
            if (store.tail) {
                store.tail.next = null;
            }

            return [true, id]
        }
        return [false, null]
    };

    private recalculateNodeRemoved(node: ListNode): void {
        if (node.prev?.val && node.val) {
            const auxBefore = PointHelpers.createAuxiliaryPoint(node.prev.val, node.val);
            this.ctx.store.insert(auxBefore, node.prev);
        }

        if (node.next?.val && node.val) {
            const auxAfter = PointHelpers.createAuxiliaryPoint(node.val, node.next.val);
            this.ctx.store.insert(auxAfter, node);
        }
    }

    logChain = (label: string) => {
        const ids: string[] = [];
        const seen = new Set<ListNode>();
        let curr = this.ctx.store.head!;
        while (curr && !seen.has(curr)) {
            ids.push(curr.val?.id.split('-').at(-1) + (curr.val?.isAuxiliary ? "(aux)" : ""));
            seen.add(curr);
            curr = curr.next!;
        }
        console.log(`${label}:`, ids.join(" → "), `(size=${this.ctx.store.size}; circ=${this.ctx.store.isCircular()}; head=${this.ctx.store.head?.val?.id.split('-').at(-1)}; tail=${this.ctx.store.tail?.val?.id.split('-').at(-1)})`);
    };

    public undo = () => {
        const node = this.removedNode
        if (!node?.val) return;

        if (this.wasRemovedHead) {
            // first remove the aux point that was added before when we removed the primary node
            this.ctx.store.removeNodeById(this.ctx.store.head?.prev?.val?.id as StepId);
            this.restoreRemovedHeadNode(node);
        } else if (this.wasRemovedTail) {
            this.restoreRemovedTailNode(node);
            if (this.wasCircular && this.ctx.store.tail?.prev?.val?.isAuxiliary) {
                this.ctx.store.removeNodeById(this.ctx.store.tail?.prev?.val?.id as StepId);
            }
        } else {
            // first remove the aux point that was added before when we removed the primary node
            if (this.executedAuxId) {
                this.ctx.store.removeNodeById(this.executedAuxId);
            }
            this.restoreRemovedMiddleNode(node)
        }

        this.ctx.store.map.set(node.val.id, node);
        this.ctx.store.size++;

        this.recalculateNodeRemoved(node);

        this.ctx.store.pingConsumers();
        this.logChain("AFTER NOTIFY");
    };
}


