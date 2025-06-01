import type { Command } from "#app/history";
import { Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { LatLng, RequiredDrawOptions, Step, StepId } from "#app/types";
import { uuidv4 } from "#app/utils/helpers";
import { PointHelpers } from "../helpers";

export class AddPointCommand implements Command {
  type: StoreChangeEventKeys = "STORE_MUTATED";
  payload: { node: Step };
  private readonly step: Step;

  constructor(
    private readonly store: Store,
    private readonly options: RequiredDrawOptions,
    coord: LatLng,
  ) {
    this.step = { id: uuidv4(), isAuxiliary: false, ...coord };
    this.payload = { node: this.step };
  }

  public execute = () => {
    this.store.push(this.step);

    // if pointGeneration is "auto" then we add an auxPoint
    if (this.options.pointGeneration === "auto" && this.store.tail?.prev?.val) {
      const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail?.val as Step, this.store.tail?.prev?.val);
      this.store.insertAfter(this.store.tail.prev, auxPoint);
    }
    this.store.notify({
      type: "STORE_MUTATED",
    });
  };

  public getStep = () => {
    return this.step;
  };

  private recalculateLastPointRemoved(): void {
    this.store.removeNodeById(this.store.tail?.val?.id as StepId);
    if (this.store.tail?.val?.isAuxiliary) {
      this.store.removeNodeById(this.store.tail?.val?.id);
      if (!this.store.circular.canBreak()) {
        const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail.val, this.store.head?.val as Step);
        this.store.push(auxPoint);
      }
      this.store.tail.next = this.store.head;
    }
  }

  public undo = () => {
    this.store.removeNodeById(this.step.id);

    if (this.options.pointGeneration === "auto") {
      this.recalculateLastPointRemoved();
    }
    if (this.store.tail) {
      this.store.notify({
        type: "STORE_MUTATED",
      });
    }
  };
}
