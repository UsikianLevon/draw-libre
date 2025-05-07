import type { Store } from "#app/store";
import type { StoreChangeEvent } from "#app/store/types";
import type { RequiredDrawOptions, Step, StepId } from "#app/types";
import { Spatial } from "#app/utils/helpers";
import { PointHelpers } from "../helpers";

export class AuxiliaryPointManager {
    constructor(private readonly store: Store, private readonly options: RequiredDrawOptions) {
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

    private rebuildAuxPoints = (event: StoreChangeEvent) => {
        if (event.type === "STORE_POINT_ADDED") {
            if (this.store.tail?.val && this.store.tail?.prev?.val) {
                const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail?.val, this.store.tail.prev.val);
                this.store.insert(auxPoint, this.store.tail.prev);
            }
        }

        if (event.type === "STORE_UNDO") {
            console.log("STORE_UNDO");

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

        if (event.type === "STORE_CLOSE_GEOMETRY") {
            if (this.options.pointGeneration === "auto" && this.store.tail?.val) {
                console.log("STORE_CLOSE_GEOMETRY", this.store.tail.val.id, this.store.head?.val?.id);

                const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail?.val, this.store.head?.val as Step);
                this.store.push(auxPoint);
            }
        }
    }
}