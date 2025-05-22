import { ListNode } from "#app/store/index";
import type { EventsCtx, Step } from "#app/types/index";
import { ELAYERS } from "#app/utils/geo_constants";
import { MapUtils } from "#app/utils/helpers";
import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";
import { PointHelpers } from "./helpers";
import type { PrimaryPointEvents } from ".";

export class AuxPoints {
  constructor(
    private readonly props: EventsCtx,
    private readonly baseEvents: PrimaryPointEvents,
  ) {
    this.initEvents();
  }

  private initBaseEvents = () => {
    const { map } = this.props;

    map.on("mouseenter", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseEnter);
    map.on("mouseleave", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseLeave);
    map.on("mousedown", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseDown);
    map.on("mouseup", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseUp);
    map.on("touchend", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseUp);
    map.on("touchstart", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseDown);
  };

  private removeBaseEvents = () => {
    const { map } = this.props;

    map.off("mouseenter", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseEnter);
    map.off("mouseleave", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseLeave);
    map.off("mousedown", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseDown);
    map.off("mouseup", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseUp);
    map.off("touchend", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseUp);
    map.off("touchstart", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseDown);
  };

  private initEvents() {
    const { map } = this.props;

    map.on("mousedown", ELAYERS.AuxiliaryPointLayer, this.onMouseDown);
    map.on("touchstart", ELAYERS.AuxiliaryPointLayer, this.onMouseDown);
    // PointsLayer because we need to check if the point was the primary point
    map.on("mousedown", ELAYERS.PointsLayer, this.onPrimaryPointMouseDown);
    map.on("touchstart", ELAYERS.PointsLayer, this.onPrimaryPointMouseDown);
    // PointsLayer becasue aux is already false
    this.initBaseEvents();
  }

  public removeEvents() {
    const { map } = this.props;
    map.off("mousedown", ELAYERS.AuxiliaryPointLayer, this.onMouseDown);
    map.off("touchstart", ELAYERS.AuxiliaryPointLayer, this.onMouseDown);
    map.off("mousedown", ELAYERS.PointsLayer, this.onPrimaryPointMouseDown);
    map.off("touchstart", ELAYERS.PointsLayer, this.onPrimaryPointMouseDown);

    this.removeBaseEvents();
  }

  private addTwoAuxiliaryPoints = (clickedNode: ListNode | null) => {
    if (!clickedNode) return;

    const { store } = this.props;

    const nextPrimaryNode = clickedNode.next;
    const prevPrimaryNode = clickedNode.prev;

    if (prevPrimaryNode) {
      const prevAuxPoint = PointHelpers.createAuxiliaryPoint(prevPrimaryNode.val as Step, clickedNode.val as Step);
      store.insert(prevAuxPoint, prevPrimaryNode);
    }

    if (nextPrimaryNode) {
      const nextAuxPoint = PointHelpers.createAuxiliaryPoint(clickedNode.val as Step, nextPrimaryNode.val as Step);
      store.insert(nextAuxPoint, clickedNode);
    }
  };

  private onPrimaryPointMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
    event.preventDefault();
  };

  private onMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { store, renderer, map } = this.props;
    // right click TODO
    if ((event.originalEvent as { button: number }).button === 2) {
      return;
    }
    const id = MapUtils.queryPointId(map, event.point);
    const node = store.findNodeById(id);
    if (node && node.val) {
      node.val.isAuxiliary = false;
      this.addTwoAuxiliaryPoints(node);
    }
    renderer.execute();
  };
}
