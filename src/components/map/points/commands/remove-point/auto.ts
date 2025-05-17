import type { Command } from "#app/history";
import type { ListNode } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { RemoveCommanContext } from ".";

export class RemovePointAutoCommand implements Command {
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
            console.log("RemovePointCommand.execute", this.ctx.nodeId, this.removedNode, this.ctx.store.head, this.ctx.store.tail);

            this.wasRemovedHead = this.ctx.store.head?.val?.id === this.ctx.nodeId;
            this.wasRemovedTail = this.ctx.store.tail?.prev?.val?.id === this.ctx.nodeId;

            this.wasCircular = this.ctx.store.isCircular();
            console.log("RemovePointCommand.execute", this.wasCircular, this.wasRemovedHead, this.wasRemovedTail);

            this.ctx.store.removeNodeById(this.ctx.nodeId);

            if (clickedNode && this.removedNode) {
                this.ctx.store.notify({
                    type: "STORE_INBETWEEN_POINT_REMOVED",
                    data: { node: clickedNode },
                });
            }
            this.ctx.store.pingConsumers();
        }
    };

    private insertBackRemovedNode = (removedNode: ListNode) => {
        if (!removedNode?.val) return;

        const { prev, next } = removedNode;

        if (prev) {
            prev.next = removedNode;
            removedNode.prev = prev;
        }

        if (next) {
            next.prev = removedNode;
            removedNode.next = next;
        }

        if (!prev) this.ctx.store.head = removedNode;
        if (!next) this.ctx.store.tail = removedNode;
    }

    private restoreRemovedHead = (removedNode: ListNode) => {
        const currentHead = this.ctx.store.head;
        if (!removedNode?.val) return;

        if (currentHead) {
            removedNode.next = currentHead;
            currentHead.prev = removedNode;
        }
        this.ctx.store.head = removedNode;

        if (this.wasCircular && this.ctx.store.tail) {
            this.ctx.store.tail.next = this.ctx.store.head;
            this.ctx.store.head.prev = this.ctx.store.tail;
        }
    }

    private restoreRemovedTail = (removedNode: ListNode) => {
        const currentTail = this.ctx.store.tail;

        if (currentTail) {
            currentTail.next = removedNode;
            removedNode.prev = currentTail;
        }
        this.ctx.store.tail = removedNode;

        if (this.wasCircular && this.ctx.store.head) {
            console.log("restoreRemovedTail", this.ctx.store.head, this.ctx.store.tail);

            removedNode.next = this.ctx.store.head;
            this.ctx.store.head.prev = removedNode;
        }
    }

    public undo = () => {
        if (!this.removedNode?.val) return;

        const node = this.removedNode
        if (!node?.val) return;
        console.log("RemovePointCommand.undo", node);

        if (this.wasRemovedHead) {
            this.restoreRemovedHead(node);
        } else if (this.wasRemovedTail) {
            this.restoreRemovedTail(node);
        } if (this.removedNode?.prev) {
            this.insertBackRemovedNode(node)
        }

        this.ctx.store.map.set(node.val.id, node);
        this.ctx.store.size++;
        this.ctx.store.pingConsumers();

        this.ctx.store.notify({
            type: "STORE_INBETWEEN_POINT_ADDED",
            data: { node },
        });
    };
}


