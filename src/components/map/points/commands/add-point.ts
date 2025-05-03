import { Command } from "#app/history";
import { Store } from "#app/store";
import type { LatLng, Step } from "#app/types";
import { uuidv4 } from "#app/utils/helpers";

export class AddPointCommand implements Command {
    type: string;
    payload: { node: Step };
    private readonly step: Step;

    constructor(private store: Store, coord: LatLng) {
        this.type = "STORE_POINT_ADDED";
        this.step = { id: uuidv4(), isAuxiliary: false, ...coord };
        this.payload = { node: this.step };
    }

    execute = () => {
        this.store.push(this.step);
    }
    getStep = () => { return this.step; }
    undo = () => { this.store.removeNodeById(this.step.id); }
}