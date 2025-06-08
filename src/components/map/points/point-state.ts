import { ListNode } from "#app/store/index";
import { LatLng, Step } from "#app/types/index";
import { MapLayerMouseEvent } from "maplibre-gl";

export class PointState {
  private selectedNode: ListNode | null = null;
  private selectedIdx: number | null = null;
  private startCoordinates: LatLng | null = null;
  private enteredStep: Step | null = null;
  private lastEvent: MapLayerMouseEvent | null = null;
  private moved: boolean = false;

  public getSelectedNode(): ListNode | null {
    return this.selectedNode;
  }

  public isMoved(): boolean {
    return this.moved;
  }

  public getSelectedIdx(): number | null {
    return this.selectedIdx;
  }

  public getStartCoordinates(): LatLng | null {
    return this.startCoordinates;
  }

  public getEnteredStep(): Step | null {
    return this.enteredStep;
  }

  public getLastEvent(): MapLayerMouseEvent | null {
    return this.lastEvent;
  }

  public setSelectedNode(node: ListNode | null): void {
    this.selectedNode = node;
  }

  public setSelectedIdx(idx: number | null): void {
    this.selectedIdx = idx;
  }

  public setStartCoordinates(coordinates: LatLng | null): void {
    this.startCoordinates = coordinates;
  }

  public setEnteredStep(step: Step | null): void {
    this.enteredStep = step;
  }

  public setLastEvent(event: MapLayerMouseEvent | null): void {
    this.lastEvent = event;
  }

  public setMoved(moved: boolean): void {
    this.moved = moved;
  }

  public clearLastEvent(): void {
    this.lastEvent = null;
  }

  public reset(): void {
    this.selectedNode = null;
    this.selectedIdx = null;
    this.startCoordinates = null;
    this.enteredStep = null;
    this.lastEvent = null;
  }

  public partialReset(): void {
    this.selectedNode = null;
    this.selectedIdx = null;
    this.startCoordinates = null;
    this.lastEvent = null;
    this.moved = false;
  }
}
