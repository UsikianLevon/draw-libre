import type { ListNode, Store } from "#app/store";
import type { StoreChangeEvent } from "#app/store/types";
import type { RequiredDrawOptions, Step, StepId } from "#app/types";
import { Spatial } from "#app/utils/helpers";
import { PointHelpers } from "../helpers";

export class AuxiliaryPointManager {
    constructor(
        private readonly store: Store,
        private readonly options: RequiredDrawOptions,
    ) {
        if (options.pointGeneration === "auto") {
            this.initConsumers();
        }
    }

    private initConsumers = () => {
        this.store.addObserver(this.rebuildAuxPoints);
    };

    public removeConsumers = () => {
        this.store.removeObserver(this.rebuildAuxPoints);
    };

    private recalculateInBetweenRemoved(clickedNode: ListNode | null): void {
        if (!clickedNode) return;

        const auxBefore = clickedNode.prev;
        const auxAfter = clickedNode.next;
        const primaryBefore = auxBefore?.prev;
        const primaryAfter = auxAfter?.next;

        if (auxBefore?.val?.isAuxiliary) {
            console.log("auxBefore");

            this.store.removeNodeById(auxBefore.val.id);
        }

        if (auxAfter?.val?.isAuxiliary) {
            console.log("auxAfter");
            this.store.removeNodeById(auxAfter.val.id);
        }

        if (primaryBefore?.val && primaryAfter?.val && this.store.size > 3) {
            console.log("auxBefore and auxAfter");

            const auxPoint = PointHelpers.createAuxiliaryPoint(primaryBefore.val, primaryAfter.val);
            this.store.insert(auxPoint, primaryBefore);
        }
    }


    private recalculateLastPointRemoved(): void {
        this.store.removeNodeById(this.store.tail?.val?.id as StepId);
        if (this.store.tail?.val?.isAuxiliary) {
            this.store.removeNodeById(this.store.tail?.val?.id);
            if (!Spatial.canBreakClosedGeometry(this.store, this.options)) {
                const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail.val, this.store.head?.val as Step);

                this.store.push(auxPoint);
            }
            this.store.tail.next = this.store.head;
        }
    }

    private rebuildAuxPoints = (event: StoreChangeEvent) => {
        switch (event.type) {
            case "STORE_POINT_ADDED":
                if (this.store.tail?.val && this.store.tail?.prev?.val) {
                    const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail?.val, this.store.tail.prev.val);
                    this.store.insert(auxPoint, this.store.tail.prev);
                }
                break;

            case "STORE_LAST_POINT_REMOVED":
                this.recalculateLastPointRemoved();
                break;

            case "STORE_CLOSE_GEOMETRY":
                if (this.options.pointGeneration === "auto" && this.store.tail?.val) {
                    const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail?.val, this.store.head?.val as Step);
                    this.store.push(auxPoint);
                }
                break;

            case "STORE_INBETWEEN_POINT_REMOVED":
                if (event.data?.node) {
                    this.recalculateInBetweenRemoved(event.data.node);
                }
                break;

            case "STORE_INBETWEEN_POINT_ADDED":
                if (event.data?.node) {
                    const node = event.data.node;

                    if (node.prev?.val && node.val) {
                        const auxBefore = PointHelpers.createAuxiliaryPoint(node.prev.val, node.val);
                        this.store.insert(auxBefore, node.prev);
                    }

                    if (node.next?.val && node.val) {
                        console.log("added", node);

                        const auxAfter = PointHelpers.createAuxiliaryPoint(node.val, node.next.val);
                        this.store.insert(auxAfter, node);
                    }
                }
                break;
            default:
                break;
        }
    };
}
