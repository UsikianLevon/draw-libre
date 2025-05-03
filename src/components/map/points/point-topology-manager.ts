import type { MapLayerMouseEvent } from "maplibre-gl";

import type { ListNode } from "#app/store/index";
import type { EventsProps, LatLng, Step } from "#app/types/index";

import { PointHelpers } from "./helpers";
import type { PointState } from "./point-state";
import { AddPointCommand } from "./commands/add-point";
import { timeline } from "#app/history";

export class PointTopologyManager {
  private props: EventsProps;
  private state: PointState;

  constructor(props: EventsProps, state: PointState) {
    this.props = props;
    this.state = state;
  }

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
  updateStore = () => {
    const lastEvent = this.state.getLastEvent();
    const selectedNode = this.state.getSelectedNode();

    if (!lastEvent || !selectedNode?.val) return;

    this.updateMainPoint(selectedNode, lastEvent);
    this.updateAuxiliaryPoints(selectedNode, lastEvent);
  };

  getAuxPointsLatLng = (event: MapLayerMouseEvent) => {
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

  addPoint(event: MapLayerMouseEvent): Step {
    const { store } = this.props;

    const cmd = new AddPointCommand(store, event.lngLat)
    timeline.commit(cmd);
    return cmd.getStep();
  }

  private recalculateAuxiliaryPoints(clickedNode: ListNode | null): void {
    if (!clickedNode) return;

    const { store } = this.props;
    const nextAuxNode = clickedNode.next;
    const prevAuxNode = clickedNode.prev;
    const nextPrimaryNode = clickedNode.next?.next;
    const prevPrimaryNode = clickedNode.prev?.prev;

    if (nextAuxNode?.val) {
      store.removeNodeById(nextAuxNode.val.id);
    }
    if (prevAuxNode?.val) {
      store.removeNodeById(prevAuxNode.val.id);
    }

    const isNonEdgeSize = store.size !== 3;
    if (nextPrimaryNode?.val && prevPrimaryNode?.val && isNonEdgeSize) {
      const auxPoint = PointHelpers.createAuxiliaryPoint(nextPrimaryNode.val, prevPrimaryNode.val);
      store.insert(auxPoint, prevPrimaryNode);
    }
  }

  removePoint(id: string): void {
    const { store, options } = this.props;

    if (store.size === 1) {
      store.reset();
      return;
    }

    const clickedNode = store.findNodeById(id);
    const isPrimaryNode = !clickedNode?.val?.isAuxiliary;

    if (isPrimaryNode) {
      store.removeNodeById(id);

      if (options.pointGeneration === "auto") {
        this.recalculateAuxiliaryPoints(clickedNode);
      }
    }
  }
}
