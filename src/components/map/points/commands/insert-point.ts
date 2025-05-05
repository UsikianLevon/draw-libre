import { Command } from "#app/history";
import { ListNode, Store } from "#app/store";
import type { LatLng, Step } from "#app/types";
import { uuidv4 } from "#app/utils/helpers";

export class InsertPointCommand implements Command {
    type: string;
    payload: { node: Step };
    private readonly step: Step;

    constructor(private readonly store: Store, step: LatLng, private readonly segmentStart: ListNode) {
        this.type = "STORE_POINT_INSERTED";
        this.step = { id: uuidv4(), isAuxiliary: false, ...step };
        this.payload = { node: this.step };
    }

    execute = () => {
        this.store.insert(this.step, this.segmentStart);
    }
    undo = () => { this.store.removeNodeById(this.step.id); }
}