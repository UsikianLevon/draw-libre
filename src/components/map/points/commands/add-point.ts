import type { Command } from "#app/history/command";
import { ListNode, Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { LatLng, RequiredDrawOptions, Step } from "#app/types";
import { uuidv4 } from "#app/utils/helpers";
import { PointHelpers } from "../helpers";

interface Snapshot {
  addedNode: ListNode | null;
  auxNode: ListNode | null;
}

export class AddPointCommand implements Command {
  type: StoreChangeEventKeys = "STORE_MUTATED";
  snapshot: Snapshot = {
    addedNode: null,
    auxNode: null,
  };
  private readonly step: Step;

  constructor(
    private readonly store: Store,
    private readonly options: RequiredDrawOptions,
    coord: LatLng,
  ) {
    this.step = { id: uuidv4(), isAuxiliary: false, ...coord };
  }

  private restoreAddedNode = (addedNode: ListNode) => {
    if (addedNode.prev) {
      addedNode.prev.next = addedNode;
    } else {
      this.store.head = addedNode;
    }

    if (addedNode.next) {
      addedNode.next.prev = addedNode;
    } else {
      this.store.tail = addedNode;
    }

    this.snapshot.addedNode = addedNode;

    if (addedNode.val) {
      this.store.map.set(addedNode.val.id, addedNode);
      this.store.size++;
      this.store.pingConsumers();
    }
  };

  private restoreAuxNode = (auxNode: ListNode) => {
    if (auxNode.prev) {
      auxNode.prev.next = auxNode;
    } else {
      this.store.head = auxNode;
    }

    if (auxNode.next) {
      auxNode.next.prev = auxNode;
    } else {
      this.store.tail = auxNode;
    }

    this.snapshot.auxNode = auxNode;

    if (auxNode.val) {
      this.store.map.set(auxNode.val.id, auxNode);
      this.store.size++;
      this.store.pingConsumers();
    }
  };

  public execute = () => {
    if (this.snapshot.addedNode) {
      this.restoreAddedNode(this.snapshot.addedNode);
    } else {
      this.snapshot.addedNode = this.store.push(this.step);
    }

    // if pointGeneration is "auto" then we add an auxPoint
    if (this.options.pointGeneration === "auto" && this.store.tail?.prev?.val) {
      if (this.snapshot?.auxNode?.val) {
        this.restoreAuxNode(this.snapshot.auxNode);
      } else {
        const auxPoint = PointHelpers.createAuxiliaryPoint(this.store.tail?.val as Step, this.store.tail?.prev?.val);
        this.snapshot.auxNode = this.store.insertAfter(this.store.tail.prev, auxPoint);
      }
    }

    this.store.notify({
      type: "STORE_POINT_ADD",
    });
  };

  public undo = () => {
    this.store.removeNodeById(this.step.id);

    if (this.options.pointGeneration === "auto" && this?.snapshot.auxNode?.val) {
      this.store.removeNodeById(this?.snapshot.auxNode.val.id);
    }
  };

  public getStep = () => {
    return this.step;
  };
}
