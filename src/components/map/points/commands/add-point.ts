import type { Command } from "#app/history";
import { Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { LatLng, Step } from "#app/types";
import { uuidv4 } from "#app/utils/helpers";

export class AddPointCommand implements Command {
    type: StoreChangeEventKeys = "STORE_POINT_ADDED"
    payload: { node: Step };
    private readonly step: Step;

    constructor(
        private readonly store: Store,
        coord: LatLng,
    ) {
        this.step = { id: uuidv4(), isAuxiliary: false, ...coord };
        this.payload = { node: this.step };
    }

    public execute = () => {
        this.store.push(this.step);

        // if pointGeneration is "auto" then we add an auxPoint in the auxPointManager
        this.store.notify({
            type: "STORE_POINT_ADDED",
            data: {
                node: this.step,
            },
        });
    };

    public getStep = () => {
        return this.step;
    };

    public undo = () => {
        this.store.removeNodeById(this.step.id);

        // if pointGeneration is "auto" then we remove the auxPoint in the auxPointManager
        if (this.store.tail) {
            this.store.notify({
                type: "STORE_LAST_POINT_REMOVED",
                data: {
                    node: this.store.tail,
                },
            });
        }
    };
}