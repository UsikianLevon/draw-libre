import { Command } from "#app/history";
import { Store } from "#app/store";
import { StoreChangeEventKeys } from "#app/store/types";
import type { LatLng, Step } from "#app/types";
import { uuidv4 } from "#app/utils/helpers";

export class AddPointCommand implements Command {
    type: StoreChangeEventKeys;
    payload: { node: Step };
    private readonly step: Step;

    constructor(private readonly store: Store, coord: LatLng) {
        this.type = "STORE_POINT_ADDED";
        this.step = { id: uuidv4(), isAuxiliary: false, ...coord };
        this.payload = { node: this.step };

    }

    execute = () => {
        this.store.push(this.step);
        this.store.notify({
            type: "STORE_POINT_ADDED",
            data: {
                node: this.step,
            },
        })
    }
    getStep = () => { return this.step; }

    undo = () => {
        this.store.removeNodeById(this.step.id);
        console.log(this.store.tail);

        if (this.store.tail) {
            console.log("12341");

            this.store.notify({
                type: "STORE_UNDO",
                data: {
                    node: this.store.tail,
                }
            })
        }
    }
}