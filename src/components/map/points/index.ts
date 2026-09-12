import type { LatLng, Step, StepId } from "#app/types/index";
import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";

import { throttle } from "#app/utils/helpers";
import { ELAYERS } from "#app/utils/geo_constants";
import { timeline } from "#app/history";
import type { StoreChangeEvent } from "#app/store/types";

import { FireEvents } from "../fire-events";
import { PointVisibility } from "./helpers";
import { FirstPoint } from "./first-point";
import { removeTransparentLine, addTransparentLine } from "../tiles/utils";
import { AuxPoints } from "./aux-points";
import type { DrawingModeChangeEvent } from "../mode/types";
import { PointState } from "./point-state";
import { PointTopologyManager } from "./point-topology-manager";
import { MovePointCommand } from "./commands/move-point";
import { renderer } from "../renderer";
import { queryPointId, isFeatureTriggered, queryPoint, getGeometryIndex, isRightClick } from "../utils";
import type { TilesContext } from "../tiles";
import { RemoveButton } from "#components/remove-button";

export interface PrimaryPointEvents {
  onPointMouseEnter: (event: MapLayerMouseEvent) => void;
  onPointMouseLeave: (event: MapLayerMouseEvent) => void;
  onPointMouseDown: (event: MapLayerMouseEvent | MapTouchEvent) => void;
  onPointMouseUp: () => void;
  onMapMouseMove: (event: MapLayerMouseEvent) => void;
}
// TODO messy: clean this up
export class PointEvents {
  private eventsInited = false;
  private events: PrimaryPointEvents;
  private firstPoint: FirstPoint | null;
  private auxPoints: AuxPoints | null;
  private pointState: PointState;
  private topologyManager: PointTopologyManager;
  private removeButton: RemoveButton;
  private pressedStep: Step | null = null;
  private pressActive = false;

  constructor(private readonly ctx: TilesContext) {
    this.pointState = new PointState();
    this.topologyManager = new PointTopologyManager(ctx, this.pointState);

    this.events = {
      onPointMouseEnter: this.onPointMouseEnter,
      onPointMouseLeave: this.onPointMouseLeave,
      onPointMouseDown: this.onPointMouseDown,
      onPointMouseUp: this.onPointMouseUp,
      onMapMouseMove: this.onMapMouseMove,
    };
    this.firstPoint = new FirstPoint(this.ctx, this.events);
    this.auxPoints = new AuxPoints(this.ctx, this.events, this.pointState, this.topologyManager);
    this.removeButton = new RemoveButton({
      map: this.ctx.map,
      options: this.ctx.options,
      onRemove: this.onPointRemove,
    });
  }

  private initConsumers = () => {
    this.ctx.mode.addObserver(this.mapModeConsumer);
    this.ctx.store.addObserver(this.storeEventsConsumer);
  };

  private removeConsumers = () => {
    this.ctx.mode.removeObserver(this.mapModeConsumer);
    this.ctx.store.removeObserver(this.storeEventsConsumer);
    this.auxPoints?.removeConsumers();
  };

  private initEvents = () => {
    const { map } = this.ctx;
    map.on("click", this.onMapClick);
    map.on("dblclick", this.onMapDblClick);
    map.on("mousemove", this.onPointerHover);

    map.on("mouseenter", ELAYERS.PointsLayer, this.onPointMouseEnter);
    map.on("mouseleave", ELAYERS.PointsLayer, this.onPointMouseLeave);
    map.on("mousedown", ELAYERS.PointsLayer, this.onPointMouseDown);
    map.on("click", ELAYERS.PointsLayer, this.onPointClick);
    map.on("mouseup", ELAYERS.PointsLayer, this.onPointMouseUp);
    map.on("touchend", ELAYERS.PointsLayer, this.onPointMouseUp);
    map.on("touchstart", ELAYERS.PointsLayer, this.onPointMouseDown);
    this.eventsInited = true;
  };

  public init = () => {
    this.initEvents();
    this.initConsumers();
  };

  private removeEvents = () => {
    const { map } = this.ctx;
    map.off("click", this.onMapClick);
    map.off("dblclick", this.onMapDblClick);
    map.off("mousemove", this.onPointerHover);
    map.off("mousemove", this.onMapMouseMove);

    map.off("mouseenter", ELAYERS.PointsLayer, this.onPointMouseEnter);
    map.off("mouseleave", ELAYERS.PointsLayer, this.onPointMouseLeave);
    map.off("mousedown", ELAYERS.PointsLayer, this.onPointMouseDown);
    map.off("click", ELAYERS.PointsLayer, this.onPointClick);
    map.off("mouseup", ELAYERS.PointsLayer, this.onPointMouseUp);
    map.off("touchend", ELAYERS.PointsLayer, this.onPointMouseUp);
    map.off("touchstart", ELAYERS.PointsLayer, this.onPointMouseDown);
    this.eventsInited = false;
  };

  public remove = () => {
    this.removeEvents();
    this.firstPoint?.remove();
    this.auxPoints?.removeEvents();
    this.removeConsumers();
    this.removeButton.destroy();
  };

  private onPointClick = (event: MapLayerMouseEvent) => {
    const { mouseEvents, store, map, options } = this.ctx;
    const id = queryPointId(map, event.point);

    if (store.isLastPoint(options, id)) {
      mouseEvents.lastPointMouseClick = true;
      mouseEvents.lastPointMouseUp = false;
    }
  };

  private onMapDblClick = (event: MapLayerMouseEvent) => {
    event.preventDefault();
  };

  private onPointRemove = (id: StepId) => {
    const { store } = this.ctx;

    if (!store.findStepById(id)) return;

    this.topologyManager.removePoint(id);
    renderer.execute();
  };

  private onOwnGeometryLayersClick = (event: MapLayerMouseEvent) => {
    return isFeatureTriggered(event, [
      ELAYERS.PointsLayer,
      ELAYERS.FirstPointLayer,
      ELAYERS.LineLayerTransparent,
      ELAYERS.LineLayerBreak,
    ]);
  };

  private onMapClick = (event: MapLayerMouseEvent) => {
    const { mode, mouseEvents, map, store } = this.ctx;

    if (mode.getClosedGeometry()) return;
    if (this.onOwnGeometryLayersClick(event)) return;

    if (mouseEvents.lastPointMouseClick) {
      mouseEvents.lastPointMouseClick = false;
    }
    map.getCanvasContainer().style.cursor = "grab";
    const addedStep = this.topologyManager.addPoint(event);
    FireEvents.addPoint({ ...addedStep, total: store.size }, map, mode);
    PointVisibility.setSinglePointHidden(event);
    renderer.execute();
  };

  private onMoveLeftClickUp = (event: MapLayerMouseEvent) => {
    const mouseLeftClickUp = event.originalEvent.buttons === 0;
    if (mouseLeftClickUp) {
      this.onPointMouseUp();
    }
  };

  private onMapMouseMove = throttle((event: MapLayerMouseEvent) => {
    const { mouseEvents } = this.ctx;

    if (mouseEvents.pointMouseDown) {
      this.pointState.setLastEvent(event);

      if (!this.pointState.getSelectedNode()) return;

      this.onMoveLeftClickUp(this.pointState.getLastEvent() as MapLayerMouseEvent);
      const auxPoints = this.topologyManager.getAuxPointsLatLng(this.pointState.getLastEvent() as MapLayerMouseEvent);
      renderer.executeOnMouseMove(this.pointState.getSelectedIdx() as number, event.lngLat, auxPoints);
      this.pointState.setMoved(true);
    }
  }, 17);

  private onPointerHover = throttle((event: MapLayerMouseEvent) => {
    const { mouseEvents, map, store } = this.ctx;

    if (mouseEvents.pointMouseDown) return;

    const id = queryPointId(map, event.point);
    const step = id ? store.findStepById(id) : null;

    if (step && !step.isAuxiliary) {
      this.removeButton.show(step);
    } else {
      this.removeButton.hide();
    }
  }, 17);

  private onPointMouseEnter = (event: MapLayerMouseEvent) => {
    const { mouseEvents, map, store, options } = this.ctx;
    if (mouseEvents) {
      mouseEvents.pointMouseEnter = true;
      if (mouseEvents.pointMouseDown) return;
    }
    PointVisibility.setSinglePointHidden(event);
    const id = queryPointId(map, event.point);
    if (store.isLastPoint(options, id)) {
      mouseEvents.lastPointMouseEnter = true;
      mouseEvents.lastPointMouseLeave = false;
    }
    const step = store.findStepById(id);
    if (step) {
      this.pointState.setEnteredStep(step);
      FireEvents.enterPoint(Object.assign({}, step, { total: store.size }), map);
    }
  };

  private onPointMouseLeave = (event: MapLayerMouseEvent) => {
    const { mouseEvents, store, map, options } = this.ctx;

    if (mouseEvents) {
      mouseEvents.pointMouseEnter = false;
      if (event.originalEvent.buttons === 0) {
        mouseEvents.pointMouseLeave = true;
      }
      if (mouseEvents.pointMouseDown) return;
    }
    const id = queryPointId(map, event.point);
    if (store.isLastPoint(options, id)) {
      mouseEvents.lastPointMouseEnter = false;
      mouseEvents.lastPointMouseLeave = true;
    }
    FireEvents.leavePoint(
      Object.assign({}, this.pointState.getEnteredStep(), {
        total: store.size,
      }),
      map,
    );
  };

  private storeEventsConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_CLEARED") {
      this.pointState.reset();
      this.removeButton.hide();
      return;
    }

    if (event.type === "STORE_MUTATED" && event.data?.size === 0) {
      this.pointState.reset();
      this.removeButton.hide();
    }
  };

  private mapModeConsumer = (event: DrawingModeChangeEvent) => {
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

    if (type === "BREAK_CHANGED" || type === "MODE_CHANGED") {
      this.pointState.reset();
      this.removeButton.hide();
    }
  };

  private hideLastPointPanel = () => {
    const { store, panel, options } = this.ctx;
    const selectedNode = this.pointState.getSelectedNode();

    if (!selectedNode?.val) return;

    if (store.isLastPoint(options, selectedNode.val.id)) {
      panel.hide();
    }
  };

  private setSelectedNode = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { store, map } = this.ctx;

    const id = queryPointId(map, event.point);
    const node = store.findNodeById(id);

    if (node) {
      this.pointState.setSelectedNode(node);
    }
  };

  private onPointMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
    event.preventDefault();

    this.pointState.clearLastEvent();

    const { mouseEvents, map, store } = this.ctx;

    if (isRightClick(event)) return;

    this.setSelectedNode(event);
    this.pressedStep = this.pointState.getSelectedNode()?.val ?? null;
    this.pressActive = true;

    removeTransparentLine(map);
    this.hideLastPointPanel();

    const point = queryPoint(map, event.point);
    const geometryIndex = getGeometryIndex(store, point?.properties.id);
    this.pointState.setSelectedIdx(geometryIndex);

    if (mouseEvents) {
      mouseEvents.pointMouseDown = true;
    }

    this.pointState.setStartCoordinates(event.lngLat);

    map.on("mousemove", this.onMapMouseMove);
    map.on("touchmove", this.onMapMouseMove);
    map.on("mouseup", this.onPointMouseUp);
    map.on("touchend", this.onPointMouseUp);
  };

  private onPointMouseUp = () => {
    const { mouseEvents, store, panel, map, options } = this.ctx;

    if (!this.pressActive) return;
    this.pressActive = false;

    map.off("mousemove", this.onMapMouseMove);
    map.off("touchmove", this.onMapMouseMove);
    map.off("mouseup", this.onPointMouseUp);
    map.off("touchend", this.onPointMouseUp);

    mouseEvents.pointMouseUp = true;

    const selectedNode = this.pointState.getSelectedNode();
    const lastEvent = this.pointState.getLastEvent();
    const startCoordinates = this.pointState.getStartCoordinates();

    if (selectedNode && !selectedNode.val?.isAuxiliary) {
      if (lastEvent) {
        this.topologyManager.updateStore();
        this.pointState.clearLastEvent();
      }

      panel?.show();

      if (this.pointState.isMoved()) {
        timeline.commit(new MovePointCommand(store, selectedNode, startCoordinates as LatLng, map));
        this.pointState.setMoved(false);
      }

      this.pointState.partialReset();
    }

    if (mouseEvents) {
      mouseEvents.pointMouseDown = false;
    }

    addTransparentLine(map, options);
    renderer.execute();
    this.showButtonForPressedStep();
  };

  private showButtonForPressedStep = () => {
    const { store } = this.ctx;
    const pressed = this.pressedStep;
    this.pressedStep = null;

    if (!pressed || pressed.isAuxiliary) return;
    if (!store.findStepById(pressed.id)) return;

    this.removeButton.show(pressed);
  };
}
