import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";

import type { LatLng } from "#app/types/index";
import { ELAYERS } from "#app/utils/geo_constants";
import { timeline } from "#app/history";
import { AuxToPrimaryCommand } from "./commands/aux-to-primary";

import { addTransparentLine } from "../tiles/utils";
import type { PrimaryPointEvents } from ".";
import { MovePointCommand } from "./commands/move-point";
import type { PointState } from "./point-state";
import type { PointTopologyManager } from "./point-topology-manager";
import { renderer } from "../renderer";
import { isRightClick, queryPointId } from "../utils";
import { TilesContext } from "../tiles";
import { DrawingModeChangeEvent } from "../mode/types";

export class AuxPoints {
  private eventsInited = false;
  constructor(
    private readonly ctx: TilesContext,
    private readonly baseEvents: PrimaryPointEvents,
    private readonly pointState: PointState,
    private readonly topologyManager: PointTopologyManager,
  ) {
    this.initEvents();
    this.initConsumers();
  }

  private initBaseEvents = () => {
    const { map } = this.ctx;

    map.on("mouseenter", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseEnter);
    map.on("mouseleave", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseLeave);
    map.on("mousedown", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseDown);
    map.on("mouseup", ELAYERS.PointsLayer, this.onMouseUp);
    map.on("touchend", ELAYERS.PointsLayer, this.onMouseUp);
    map.on("touchstart", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseDown);
  };

  private removeBaseEvents = () => {
    const { map } = this.ctx;

    map.off("mouseenter", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseEnter);
    map.off("mouseleave", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseLeave);
    map.off("mousedown", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseDown);
    map.off("mouseup", ELAYERS.PointsLayer, this.onMouseUp);
    map.off("touchend", ELAYERS.PointsLayer, this.onMouseUp);
    map.off("touchstart", ELAYERS.AuxiliaryPointLayer, this.baseEvents.onPointMouseDown);
  };

  private initConsumers = () => {
    this.ctx.mode.addObserver(this.onMapModeChangeConsumer);
  };

  public removeConsumers = () => {
    this.ctx.mode.removeObserver(this.onMapModeChangeConsumer);
  };

  private onMapModeChangeConsumer = (event: DrawingModeChangeEvent) => {
    const { type, data } = event;

    if (type === "MODE_CHANGED" && !data) {
      if (this.eventsInited) {
        this.removeEvents();
      }
    } else if (type === "MODE_CHANGED" && data) {
      if (!this.eventsInited) {
        this.initEvents();
      }
    }
  };

  private initEvents() {
    const { map } = this.ctx;

    map.on("mousedown", ELAYERS.AuxiliaryPointLayer, this.onMouseDown);
    map.on("touchstart", ELAYERS.AuxiliaryPointLayer, this.onMouseDown);
    // PointsLayer becasue aux is already false
    this.initBaseEvents();
    this.eventsInited = true;
  }

  public removeEvents() {
    const { map } = this.ctx;
    map.off("mousedown", ELAYERS.AuxiliaryPointLayer, this.onMouseDown);
    map.off("touchstart", ELAYERS.AuxiliaryPointLayer, this.onMouseDown);

    this.removeBaseEvents();
    this.eventsInited = false;
  }

  private onMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { store, map } = this.ctx;

    if (isRightClick(event)) return;

    const id = queryPointId(map, event.point);
    const node = store.findNodeById(id);

    if (node) {
      timeline.beginTransaction("PointCompound");
      timeline.commit(new AuxToPrimaryCommand(store, node));
      renderer.execute();
    }
  };

  private onMouseUp = () => {
    const { mouseEvents, store, panel, map, options } = this.ctx;

    mouseEvents.pointMouseUp = true;

    const selectedNode = this.pointState.getSelectedNode();
    const lastEvent = this.pointState.getLastEvent();
    const startCoordinates = this.pointState.getStartCoordinates();

    if (selectedNode && selectedNode.val) {
      if (lastEvent) {
        this.topologyManager.updateStore();
        this.pointState.clearLastEvent();
      }

      panel?.show();
      if (this.pointState.isMoved()) {
        timeline.commit(new MovePointCommand(store, selectedNode, startCoordinates as LatLng, map));
        timeline.commitTransaction();
      }
      this.pointState.partialReset();
    }

    if (mouseEvents) {
      mouseEvents.pointMouseDown = false;
    }

    addTransparentLine(map, options);
  };
}
