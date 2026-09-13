import type { LatLng, Step, StepId } from "#app/types/index";
import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";

import { throttle } from "#app/utils/helpers";
import { EVENTS } from "#app/utils/constants";
import { ELAYERS, ESOURCES } from "#app/utils/geo_constants";
import { timeline } from "#app/history";
import type { StoreChangeEvent } from "#app/store/types";

import { FireEvents } from "../fire-events";
import { PointVisibility } from "./helpers";
import { FirstPoint } from "./first-point";
import { hideTransparentLine, showTransparentLine } from "../tiles/utils";
import { AuxPoints } from "./aux-points";
import type { DrawingModeChangeEvent } from "../mode/types";
import { PointState } from "./point-state";
import { PointTopologyManager } from "./point-topology-manager";
import { MovePointCommand } from "./commands/move-point";
import { renderer } from "../renderer";
import {
  queryPointId,
  isFeatureTriggered,
  queryPoint,
  getGeometryIndex,
  isRightClick,
  POINT_HIT_LAYERS,
} from "../utils";
import type { TilesContext } from "../tiles";
import { DOM } from "#app/dom";
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
  private suppressedStepId: StepId | null = null;
  private highlightedStepId: StepId | null = null;

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
    DOM.addEventListener(map.getContainer(), "mouseleave", this.onPointerLeaveMap);
    map.on(EVENTS.ADD, this.onPointAdded);

    map.on("mouseenter", ELAYERS.PointsHitLayer, this.onPointMouseEnter);
    map.on("mouseleave", ELAYERS.PointsHitLayer, this.onPointMouseLeave);
    map.on("mousedown", ELAYERS.PointsHitLayer, this.onPointMouseDown);
    map.on("click", ELAYERS.PointsHitLayer, this.onPointClick);
    map.on("mouseup", ELAYERS.PointsHitLayer, this.onPointMouseUp);
    map.on("touchend", ELAYERS.PointsHitLayer, this.onPointMouseUp);
    map.on("touchstart", ELAYERS.PointsHitLayer, this.onPointMouseDown);
    this.eventsInited = true;
  };

  public init = () => {
    this.initEvents();
    this.initConsumers();
  };

  private removeEvents = () => {
    const { map } = this.ctx;
    this.highlight(null);
    map.off("click", this.onMapClick);
    map.off("dblclick", this.onMapDblClick);
    map.off("mousemove", this.onPointerHover);
    DOM.removeEventListener(map.getContainer(), "mouseleave", this.onPointerLeaveMap);
    map.off("mousemove", this.onMapMouseMove);
    map.off(EVENTS.ADD, this.onPointAdded);

    map.off("mouseenter", ELAYERS.PointsHitLayer, this.onPointMouseEnter);
    map.off("mouseleave", ELAYERS.PointsHitLayer, this.onPointMouseLeave);
    map.off("mousedown", ELAYERS.PointsHitLayer, this.onPointMouseDown);
    map.off("click", ELAYERS.PointsHitLayer, this.onPointClick);
    map.off("mouseup", ELAYERS.PointsHitLayer, this.onPointMouseUp);
    map.off("touchend", ELAYERS.PointsHitLayer, this.onPointMouseUp);
    map.off("touchstart", ELAYERS.PointsHitLayer, this.onPointMouseDown);
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
    return isFeatureTriggered(event, [...POINT_HIT_LAYERS, ELAYERS.LineLayerTransparent, ELAYERS.LineLayerBreak]);
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

  private onPointAdded = (event: { id: StepId }) => {
    this.suppressedStepId = event.id;
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

  private highlight = (id: StepId | null) => {
    const { map } = this.ctx;
    if (this.highlightedStepId === id) return;

    if (this.highlightedStepId !== null) {
      map.removeFeatureState({ source: ESOURCES.UnifiedSource, id: this.highlightedStepId });
    }

    this.highlightedStepId = id;

    if (id !== null) {
      map.setFeatureState({ source: ESOURCES.UnifiedSource, id }, { hover: true });
    }
  };

  private onPointerLeaveMap = () => {
    this.highlight(null);
  };

  private onPointerHover = throttle((event: MapLayerMouseEvent) => {
    const { mouseEvents, map, store } = this.ctx;

    if (!this.eventsInited) return;
    if (mouseEvents.pointMouseDown) return;

    const id = queryPointId(map, event.point);
    this.highlight(id ?? null);

    if (id !== this.suppressedStepId) {
      this.suppressedStepId = null;
    } else if (id) {
      this.removeButton.hide();
      return;
    }

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

  private dismissButton = () => {
    this.suppressedStepId = null;
    this.removeButton.hide();
  };

  private storeEventsConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_CLEARED") {
      this.pointState.reset();
      this.dismissButton();
      return;
    }

    if (event.type === "STORE_MUTATED" && event.data?.size === 0) {
      this.pointState.reset();
      this.dismissButton();
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
      this.dismissButton();
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

    this.suppressedStepId = null;
    this.setSelectedNode(event);
    this.pressedStep = this.pointState.getSelectedNode()?.val ?? null;
    this.pressActive = true;

    hideTransparentLine(map);
    this.hideLastPointPanel();

    const point = queryPoint(map, event.point);
    const geometryIndex = getGeometryIndex(store, point?.properties.id);
    this.pointState.setSelectedIdx(geometryIndex);

    if (mouseEvents) {
      mouseEvents.pointMouseDown = true;
    }

    this.pointState.setStartCoordinates(
      this.pressedStep ? { lat: this.pressedStep.lat, lng: this.pressedStep.lng } : event.lngLat,
    );

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

    showTransparentLine(map);
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
