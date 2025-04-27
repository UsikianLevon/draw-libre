import type { MapLayerMouseEvent } from "maplibre-gl";

import type { ListNode } from "#store/index";
import type { EventsProps, LatLng, Step } from "#types/index";
import { uuidv4 } from "#utils/helpers";

import { PointHelpers } from "./helpers";
import type { PointState } from "./point-state";

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
    }

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
            } as const
        }
        return null;
    }


    addPointToStore(event: MapLayerMouseEvent): Step {
        const { store, options } = this.props;
        const nextStep = { ...event.lngLat, id: uuidv4() };

        if (options.pointGeneration === "auto" && store?.tail?.val && store.size >= 1) {
            const auxPoint = PointHelpers.createAuxiliaryPoint(store.tail.val, nextStep);
            store.push(auxPoint);
        }

        const addedStep = PointHelpers.addPointToMap(event, this.props);
        return addedStep;
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
            const auxPoint = PointHelpers.createAuxiliaryPoint(
                nextPrimaryNode.val,
                prevPrimaryNode.val
            );
            store.insert(auxPoint, prevPrimaryNode);
        }
    }

    removePointFromStore(id: string): void {
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