import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";

import { ELAYERS } from "#app/utils/geo_constants";
import { timeline } from "#app/history";
import { AuxToPrimaryCommand } from "./commands/aux-to-primary";

import type { PrimaryPointEvents } from ".";
import { renderer } from "../renderer";
import { isRightClick, queryPointId } from "../utils";
import { TilesContext } from "../tiles";
import { DrawingModeChangeEvent } from "../mode/types";

export class AuxPoints {
  private eventsInited = false;
  constructor(
    private readonly ctx: TilesContext,
    private readonly baseEvents: PrimaryPointEvents,
  ) {
    this.initEvents();
    this.initConsumers();
  }

  private initBaseEvents = () => {
    const { map } = this.ctx;

    map.on("mouseenter", ELAYERS.AuxiliaryPointHitLayer, this.baseEvents.onPointMouseEnter);
    map.on("mouseleave", ELAYERS.AuxiliaryPointHitLayer, this.baseEvents.onPointMouseLeave);
    map.on("mousedown", ELAYERS.AuxiliaryPointHitLayer, this.baseEvents.onPointMouseDown);
    map.on("touchstart", ELAYERS.AuxiliaryPointHitLayer, this.baseEvents.onPointMouseDown);
  };

  private removeBaseEvents = () => {
    const { map } = this.ctx;

    map.off("mouseenter", ELAYERS.AuxiliaryPointHitLayer, this.baseEvents.onPointMouseEnter);
    map.off("mouseleave", ELAYERS.AuxiliaryPointHitLayer, this.baseEvents.onPointMouseLeave);
    map.off("mousedown", ELAYERS.AuxiliaryPointHitLayer, this.baseEvents.onPointMouseDown);
    map.off("touchstart", ELAYERS.AuxiliaryPointHitLayer, this.baseEvents.onPointMouseDown);
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

    map.on("mousedown", ELAYERS.AuxiliaryPointHitLayer, this.onMouseDown);
    map.on("touchstart", ELAYERS.AuxiliaryPointHitLayer, this.onMouseDown);
    this.initBaseEvents();
    this.eventsInited = true;
  }

  public removeEvents() {
    const { map } = this.ctx;
    map.off("mousedown", ELAYERS.AuxiliaryPointHitLayer, this.onMouseDown);
    map.off("touchstart", ELAYERS.AuxiliaryPointHitLayer, this.onMouseDown);

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
}
