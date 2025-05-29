import type { Command } from "#app/history";
import type { ListNode, Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { Step } from "#app/types";
import { PointHelpers } from "../helpers";

interface Snapshot {
    clickedNode: ListNode;
    prevPrimaryNode: ListNode | null;
    nextPrimaryNode: ListNode | null;
    prevAuxNode: ListNode | null;
    nextAuxNode: ListNode | null;
}

export class AuxToPrimaryCommand implements Command {
    type: StoreChangeEventKeys = "STORE_AUX_TO_PRIMARY"
    snapshot: Snapshot | null = null;
    constructor(private readonly store: Store, private readonly clickedNode: ListNode) {
        this.snapshot = this.makeSnapshot(clickedNode);
    }

    private makeSnapshot(clickedNode: ListNode): Snapshot {
        const prevPrimaryNode = clickedNode.prev
        const nextPrimaryNode = clickedNode.next
        const prevAuxNode = null
        const nextAuxNode = null

        return {
            clickedNode,
            prevPrimaryNode,
            nextPrimaryNode,
            prevAuxNode,
            nextAuxNode,
        };
    }

    private restorePreviousAux = (clickedNode: ListNode) => {
        if (!this.snapshot) return;
        let { prevPrimaryNode } = this.snapshot;

        if (prevPrimaryNode) {
            prevPrimaryNode.next = this.snapshot.prevAuxNode;
        }
        this.snapshot.prevAuxNode!.prev = prevPrimaryNode;
        this.clickedNode.prev = this.snapshot.prevAuxNode;
        this.snapshot.prevAuxNode!.next = clickedNode;
        if (this.snapshot.prevAuxNode?.val?.id) {
            this.store.map.set(this.snapshot.prevAuxNode?.val?.id, this.snapshot.prevAuxNode);
            this.store.size++
        }
    }

    private restoreNextAux = (clickedNode: ListNode) => {
        if (!this.snapshot) return;
        let { nextPrimaryNode } = this.snapshot;

        clickedNode.next = this.snapshot.nextAuxNode;
        if (this.snapshot.nextAuxNode) {
            this.snapshot.nextAuxNode.prev = clickedNode;
            this.snapshot.nextAuxNode.next = nextPrimaryNode;
        }
        if (nextPrimaryNode) {
            nextPrimaryNode.prev = this.snapshot.nextAuxNode;
        }

        const wasDraggingLastPoint = clickedNode.next?.next === this.store.head
        if (wasDraggingLastPoint) {
            const lastAuxNode = clickedNode.next;
            this.store.tail = lastAuxNode;
            if (this.store.head) {
                this.store.head.prev = lastAuxNode;
            }
            if (this.store.tail) {
                this.store.tail.next = this.store.head;
            }
        }

        if (this.snapshot.nextAuxNode?.val?.id) {
            this.store.map.set(this.snapshot.nextAuxNode.val?.id, this.snapshot.nextAuxNode);
            this.store.size++;
        }

    }

    private addTwoAuxiliaryPoints = (clickedNode: ListNode | null) => {
        if (!clickedNode || !this.snapshot) return;
        let { nextPrimaryNode, prevPrimaryNode } = this.snapshot;

        if (prevPrimaryNode) {
            if (this.snapshot.prevAuxNode) {
                this.restorePreviousAux(clickedNode);
            } else {
                const prevAuxPoint = PointHelpers.createAuxiliaryPoint(prevPrimaryNode.val as Step, clickedNode.val as Step);
                this.snapshot.prevAuxNode = this.store.insertAfter(prevPrimaryNode, prevAuxPoint);
            }
        }

        if (nextPrimaryNode) {
            if (this.snapshot.nextAuxNode) {
                this.restoreNextAux(clickedNode);
            }
            else {
                const nextAuxPoint = PointHelpers.createAuxiliaryPoint(clickedNode.val as Step, nextPrimaryNode.val as Step);
                this.snapshot.nextAuxNode = this.store.insertAfter(clickedNode, nextAuxPoint);
            }
        }
    };

    public execute = () => {
        if (!this.snapshot) return;
        const { clickedNode } = this.snapshot;
        if (clickedNode && clickedNode.val) {
            clickedNode.val.isAuxiliary = false;
            this.addTwoAuxiliaryPoints(clickedNode);
        }
    };

    private removeTwoAuxiliaryPoints = (clickedNode: ListNode | null) => {
        if (!clickedNode || !this.snapshot) return;
        const { prevAuxNode, nextAuxNode } = this.snapshot;

        if (prevAuxNode?.val?.isAuxiliary) {
            this.store.removeNodeById(prevAuxNode.val?.id);
        }
        if (nextAuxNode?.val?.isAuxiliary) {
            this.store.removeNodeById(nextAuxNode?.val.id);
        }
    }

    public undo = () => {
        if (!this.snapshot) return;
        const { clickedNode } = this.snapshot;
        if (clickedNode && clickedNode.val) {
            clickedNode.val.isAuxiliary = true;
            this.removeTwoAuxiliaryPoints(clickedNode);
        }
    };
}