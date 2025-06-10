import { ListNode, Store } from "#app/store";
import type { StoreChangeEventKeys } from "#app/store/types";
import type { LatLng } from "#app/types";
import { UnifiedMap } from "#app/types/map";
import { FireEvents } from "#components/map/helpers";
import type { Command } from "#app/history/command";
import { PointHelpers } from "../helpers";

export class MovePointCommand implements Command {
  type: StoreChangeEventKeys = "STORE_POINT_MOVED";
  end: LatLng;
  constructor(
    private readonly store: Store,
    private readonly selectedNode: ListNode,
    private readonly start: LatLng,
    private readonly map: UnifiedMap,
  ) {
    this.end = { lat: selectedNode.val!.lat, lng: selectedNode.val!.lng };
  }

  private updateNeighbors = (node: ListNode) => {
    const prevAux = node.prev;
    const nextAux = node.next;
    // pretty much a check for the pointGeneration === "auto"
    if (!prevAux?.val?.isAuxiliary && !nextAux?.val?.isAuxiliary) return;

    const prevPrimary = node.prev?.prev;
    const nextPrimary = node.next?.next;

    if (prevPrimary?.val && this.selectedNode?.val && prevAux) {
      const midPoint = PointHelpers.getMidpoint(this.selectedNode?.val, prevPrimary?.val);
      if (prevAux.val) {
        prevAux.val.lat = midPoint.lat;
        prevAux.val.lng = midPoint.lng;
      }
    }

    if (nextPrimary?.val && this.selectedNode?.val && nextAux) {
      const midPoint = PointHelpers.getMidpoint(this.selectedNode?.val, nextPrimary?.val);
      if (nextAux.val) {
        nextAux.val.lat = midPoint.lat;
        nextAux.val.lng = midPoint.lng;
      }
    }
  };

  public execute = () => {
    if (!this.selectedNode.val) return;
    const point = this.store.findStepById(this.selectedNode.val?.id);
    if (point) {
      point.lat = this.end.lat;
      point.lng = this.end.lng;
      this.updateNeighbors(this.selectedNode);

      this.store.notify({
        type: "STORE_MUTATED",
        data: this.store,
      });
      FireEvents.movePoint(
        {
          id: this.selectedNode.val.id,
          total: this.store.size,
          end: { lat: this.selectedNode.val.lat, lng: this.selectedNode.val.lng },
          start: this.start as LatLng,
        },
        this.map,
      );
    }
  };

  public undo = () => {
    if (!this.selectedNode.val) return;
    const point = this.store.findStepById(this.selectedNode.val?.id);
    if (point) {
      point.lat = this.start.lat;
      point.lng = this.start.lng;
      this.updateNeighbors(this.selectedNode);

      this.store.notify({
        type: "STORE_MUTATED",
        data: this.store,
      });
      FireEvents.movePoint(
        {
          id: this.selectedNode.val.id,
          total: this.store.size,
          end: this.start,
          start: this.end,
        },
        this.map,
      );
    }
  };
}
