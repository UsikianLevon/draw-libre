import type { MapLayerMouseEvent } from "maplibre-gl";

import type { ListNode } from "#app/store/index";
import type { EventsCtx, LatLng, Step } from "#app/types/index";

import { PointHelpers } from "./helpers";
import type { PointState } from "./point-state";
import { AddPointCommand } from "./commands/add-point";
import { timeline } from "#app/history";
import { RemovePointCommand } from "./commands/remove-point";

export class PointTopologyManager {
  constructor(
    private readonly props: EventsCtx,
    private readonly state: PointState,
  ) { }

  private updateMainPoint(node: ListNode, event: MapLayerMouseEvent): void {
    if (node.val) {
      node.val.lat = event.lngLat.lat;
      node.val.lng = event.lngLat.lng;
    }
  }

  private updateAuxiliaryPoints(node: ListNode, event: MapLayerMouseEvent): void {
    const auxPoints = this.getAuxPointsLatLng(event);
    if (!auxPoints) return;

    this.updatePrevAuxPoint(node, auxPoints.prev);
    this.updateNextAuxPoint(node, auxPoints.next);
  }

  private updatePrevAuxPoint(node: ListNode, prevCoords: LatLng | null): void {
    if (node.prev?.val && prevCoords) {
      node.prev.val.lat = prevCoords.lat;
      node.prev.val.lng = prevCoords.lng;
    }
  }

  private updateNextAuxPoint(node: ListNode, nextCoords: LatLng | null): void {
    if (node.next?.val && nextCoords) {
      node.next.val.lat = nextCoords.lat;
      node.next.val.lng = nextCoords.lng;
    }
  }

  // we've got the reference to the selected node from the store and just updating the lat/lng when mouse up event happens
  public updateStore = () => {
    const lastEvent = this.state.getLastEvent();
    const selectedNode = this.state.getSelectedNode();

    if (!lastEvent || !selectedNode?.val) return;

    this.updateMainPoint(selectedNode, lastEvent);
    this.updateAuxiliaryPoints(selectedNode, lastEvent);
  };

  public getAuxPointsLatLng = (event: MapLayerMouseEvent) => {
    const selectedNode = this.state.getSelectedNode();
    if (!selectedNode) return null;

    const { options } = this.props;
    const prevPrimary = selectedNode?.prev?.prev;
    const nextPrimary = selectedNode?.next?.next;

    if (options.pointGeneration === "auto") {
      return {
        next: nextPrimary?.val ? PointHelpers.getMidpoint(nextPrimary.val, event.lngLat) : null,
        prev: prevPrimary?.val ? PointHelpers.getMidpoint(event.lngLat, prevPrimary.val) : null,
      } as const;
    }
    return null;
  };

  public addPoint(event: MapLayerMouseEvent): Step {
    const { store } = this.props;

    const cmd = new AddPointCommand(store, event.lngLat);
    timeline.commit(cmd);
    return cmd.getStep();
  }

  public removePoint(id: string): void {
    const { store, options, mode, map } = this.props;

    if (store.size === 1) {
      store.reset();
    } else {
      timeline.commit(new RemovePointCommand({ store, options, mode, map, nodeId: id, }));
    }
  }
}
