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
            this.store.removeNodeById(auxBefore.val.id);
        }

        if (auxAfter?.val?.isAuxiliary) {
            this.store.removeNodeById(auxAfter.val.id);
        }

        // 5(in a circular and only 3 in a linear) is the minimum number of points needed to add an aux point after removal 
        // head -> aux -> primary -> aux -> tail;
        //                   ^
        //                removed
        // head -> aux -> tail; 
        //          ^ this needs to be added
        const meetsAuxInsertionThreshold = this.store.isCircular() ? this.store.size >= 5 : this.store.size >= 3;
        if (primaryBefore?.val && primaryAfter?.val && meetsAuxInsertionThreshold) {
            console.log("meetsAuxInsertionThreshold");

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
            default:
                break;
        }
    };
}
