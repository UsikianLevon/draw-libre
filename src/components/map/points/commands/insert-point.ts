import { Command } from "#app/history";
import { ListNode, Store } from "#app/store";
import type { LatLng, Step } from "#app/types";
import { uuidv4 } from "#app/utils/helpers";

export class InsertPointCommand implements Command {
  type: string;
  payload: { node: Step };
  private readonly step: Step;

  constructor(
    private readonly store: Store,
    readonly coords: LatLng,
    private readonly segmentStart: ListNode,
  ) {
    this.type = "STORE_POINT_INSERTED";
    this.step = { id: uuidv4(), isAuxiliary: false, ...coords };
    this.payload = { node: this.step };
  }

  execute = () => {
    this.store.insert(this.step, this.segmentStart);
    this.store.notify({
      type: "STORE_POINT_INSERTED",
      data: {
        node: this.step,
      },
    });
  };

  undo = () => {
    this.store.removeNodeById(this.step.id);
  };

}
