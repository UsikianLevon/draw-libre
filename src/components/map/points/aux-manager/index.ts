import type { Store } from "#app/store";
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
          this.store.insertAfter(this.store.tail.prev, auxPoint);
        }
        break;

      case "STORE_LAST_POINT_REMOVED":
        this.recalculateLastPointRemoved();
        break;
      default:
        break;
    }
  };
}
