import type { Command } from "#app/history";
import type { ListNode } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { Step } from "#app/types";
import { Spatial } from "#app/utils/helpers";
import { FireEvents } from "#components/map/helpers";
import type { RemoveCommanContext } from ".";

export class RemovePointManualCommand implements Command {
    type: StoreChangeEventKeys = "STORE_INBETWEEN_POINT_REMOVED"
    removedNode: ListNode | null = null;
    wasRemovedHead: boolean = false;
    wasRemovedTail: boolean = false;
    wasCircular: boolean = false;

    constructor(
        private readonly ctx: RemoveCommanContext,
    ) { }

    public execute = () => {
        const clickedNode = this.ctx.store.findNodeById(this.ctx.nodeId);
        const isPrimaryNode = !clickedNode?.val?.isAuxiliary;

        if (isPrimaryNode) {
            this.removedNode = clickedNode;
            this.wasRemovedHead = this.ctx.store.head?.val?.id === this.ctx.nodeId;
            this.wasRemovedTail = this.ctx.store.tail?.val?.id === this.ctx.nodeId;
            this.wasCircular = this.ctx.store.isCircular();

            this.ctx.store.removeNodeById(this.ctx.nodeId);
            const isPrimaryNode = !clickedNode?.val?.isAuxiliary;

            if (isPrimaryNode) {
                const switched = Spatial.switchToLineModeIfCan(this.ctx);
                if (switched) {
                    this.ctx.mode.reset();
                }
                FireEvents.pointRemoveRightClick({ ...(clickedNode?.val as Step), total: this.ctx.store.size }, this.ctx.map);
            }
            this.ctx.store.pingConsumers();
        }
    };

    private restoreRemovedNode = (removedNode: ListNode) => {
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

        if (this.wasCircular && !this.ctx.store.isCircular()) {
            const head = this.ctx.store.head;
            const tail = this.ctx.store.tail;

            if (head && tail) {
                tail.next = head;
                head.prev = tail;
                this.ctx.mode.setClosedGeometry(true);
            }
        }
    }

    private restoreRemovedHead = (removedNode: ListNode) => {
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

    private restoreRemovedTail = (removedNode: ListNode) => {
        const currentTail = this.ctx.store.tail;

        if (currentTail) {
            currentTail.next = removedNode;
            removedNode.prev = currentTail;
        }
        this.ctx.store.tail = removedNode;
        const notCircularNow = !this.ctx.store.isCircular();
        if (this.wasCircular && notCircularNow) {
            removedNode.next = this.ctx.store.head;
            this.ctx.store.head!.prev = removedNode;
            this.ctx.mode.setClosedGeometry(true);
        }
    }

    public undo = () => {
        if (!this.removedNode?.val) return;
        if (this.wasRemovedHead) {
            this.restoreRemovedHead(this.removedNode);
        } else if (this.wasRemovedTail) {
            this.restoreRemovedTail(this.removedNode);
        } else if (this.removedNode?.prev) {
            this.restoreRemovedNode(this.removedNode)
        }

        this.ctx.store.map.set(this.ctx.nodeId, this.removedNode);
        this.ctx.store.size++;
        this.ctx.store.pingConsumers();
    };
}