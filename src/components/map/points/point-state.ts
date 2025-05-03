import { ListNode } from "#app/store/index";
import { LatLng, Step } from "#app/types/index";
import { MapLayerMouseEvent } from "maplibre-gl";

export class PointState {
  private selectedNode: ListNode | null = null;
  private selectedIdx: number | null = null;
  private startCoordinates: LatLng | null = null;
  private enteredStep: Step | null = null;
  private lastEvent: MapLayerMouseEvent | null = null;

  getSelectedNode(): ListNode | null {
    return this.selectedNode;
  }

  getSelectedIdx(): number | null {
    return this.selectedIdx;
  }

  getStartCoordinates(): LatLng | null {
    return this.startCoordinates;
  }

  getEnteredStep(): Step | null {
    return this.enteredStep;
  }

  getLastEvent(): MapLayerMouseEvent | null {
    return this.lastEvent;
  }

  setSelectedNode(node: ListNode | null): void {
    this.selectedNode = node;
  }

  setSelectedIdx(idx: number | null): void {
    this.selectedIdx = idx;
  }

  setStartCoordinates(coordinates: LatLng | null): void {
    this.startCoordinates = coordinates;
  }

  setEnteredStep(step: Step | null): void {
    this.enteredStep = step;
  }

  setLastEvent(event: MapLayerMouseEvent | null): void {
    this.lastEvent = event;
  }

  clearLastEvent(): void {
    this.lastEvent = null;
  }

  reset(): void {
    this.selectedNode = null;
    this.selectedIdx = null;
    this.startCoordinates = null;
    this.enteredStep = null;
    this.lastEvent = null;
  }

  partialReset(): void {
    this.selectedNode = null;
    this.selectedIdx = null;
    this.startCoordinates = null;
    this.lastEvent = null;
  }
}
