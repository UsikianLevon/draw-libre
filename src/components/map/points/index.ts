import type { EventsProps, LatLng, Step } from "#types/index";
import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";

import { MapUtils, Spatial, throttle } from "#utils/helpers";
import { ELAYERS } from "#utils/geo_constants";
import { StoreHelpers } from "#store/index";

import { FireEvents } from "../helpers";
import { PointVisibility } from "./helpers";
import { FirstPoint } from "./first-point";
import { removeTransparentLine, addTransparentLine } from "../tiles/helpers";
import { AuxPoints } from "./aux-points";
import { StoreChangeEvent } from "#store/types";
import { DrawingModeChangeEvent } from "../mode/types";
import { PointState } from "./point-state";
import { PointTopologyManager } from "./point-topology-manager";

export interface PrimaryPointEvents {
  onPointMouseEnter: (event: MapLayerMouseEvent) => void;
  onPointMouseLeave: (event: MapLayerMouseEvent) => void;
  onPointMouseDown: (event: MapLayerMouseEvent | MapTouchEvent) => void;
  onPointMouseUp: () => void;
  onMapMouseMove: (event: MapLayerMouseEvent) => void;
}

export class PointEvents {
  private props: EventsProps;
  private events: PrimaryPointEvents
  private firstPoint: FirstPoint | null;
  private auxPoints: AuxPoints | null;
  private pointState: PointState;
  private topologyManager: PointTopologyManager;

  constructor(props: EventsProps) {
    this.props = props;
    this.pointState = new PointState();
    this.topologyManager = new PointTopologyManager(props, this.pointState);
    this.events = {
      onPointMouseEnter: this.#onPointMouseEnter,
      onPointMouseLeave: this.#onPointMouseLeave,
      onPointMouseDown: this.#onPointMouseDown,
      onPointMouseUp: this.#onPointMouseUp,
      onMapMouseMove: this.#onMapMouseMove,
    };
    this.firstPoint = new FirstPoint(this.props, this.events);
    this.auxPoints = new AuxPoints(this.props, this.events);
  }

  #initConsumers = () => {
    this.props.mode.addObserver(this.#mapModeConsumer);
    this.props.store.addObserver(this.#storeEventsConsumer);
  }

  #removeConsumers = () => {
    this.props.mode.removeObserver(this.#mapModeConsumer);
    this.props.store.removeObserver(this.#storeEventsConsumer);
  }

  initEvents = () => {
    const { map } = this.props;
    map.on("click", this.#onMapClick);
    map.on("dblclick", this.#onMapDblClick);

    map.on("mouseenter", ELAYERS.PointsLayer, this.#onPointMouseEnter);
    map.on("mouseleave", ELAYERS.PointsLayer, this.#onPointMouseLeave);
    map.on("mousedown", ELAYERS.PointsLayer, this.#onPointMouseDown);
    map.on("mouseup", ELAYERS.PointsLayer, this.#onPointMouseUp);
    map.on("touchend", ELAYERS.PointsLayer, this.#onPointMouseUp);
    map.on("touchstart", ELAYERS.PointsLayer, this.#onPointMouseDown);

    this.#initConsumers();
  };

  removeEvents = () => {
    const { map } = this.props;
    map.off("click", this.#onMapClick);
    map.off("dblclick", this.#onMapDblClick);
    map.off("mousemove", this.#onMapMouseMove);

    map.off("mouseenter", ELAYERS.PointsLayer, this.#onPointMouseEnter);
    map.off("mouseleave", ELAYERS.PointsLayer, this.#onPointMouseLeave);
    map.off("mousedown", ELAYERS.PointsLayer, this.#onPointMouseDown);
    map.off("mouseup", ELAYERS.PointsLayer, this.#onPointMouseUp);
    map.off("touchend", ELAYERS.PointsLayer, this.#onPointMouseUp);
    map.off("touchstart", ELAYERS.PointsLayer, this.#onPointMouseDown);

    this.firstPoint?.removeEvents();
    this.auxPoints?.removeEvents();
    this.#removeConsumers();
  };

  #onMapDblClick = (event: MapLayerMouseEvent) => {
    event.preventDefault();
  };

  #onPointRemove = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { store, tiles, options, mouseEvents } = this.props;
    if (store.size === 1) {
      store.reset();
    } else {
      const id = MapUtils.queryPointId(this.props.map, event.point);
      this.topologyManager.removePointFromStore(id);

      const clickedNode = store.findNodeById(id);
      const isPrimaryNode = !clickedNode?.val?.isAuxiliary;

      if (isPrimaryNode) {
        Spatial.switchToLineModeIfCan(this.props);
        FireEvents.pointRemoveRightClick({ ...clickedNode?.val as Step, total: store.size }, this.props.map);
        if (StoreHelpers.isLastPoint(store, options, id)) {
          mouseEvents.lastPointMouseClick = true;
          mouseEvents.lastPointMouseUp = false;
        }

      }
    }
    tiles.render();
  };

  #onOwnGeometryLayersClick = (event: MapLayerMouseEvent) => {
    return MapUtils.isFeatureTriggered(event, [
      ELAYERS.PointsLayer,
      ELAYERS.FirstPointLayer,
      ELAYERS.LineLayerTransparent,
      ELAYERS.LineLayerBreak,
    ]);
  };

  #onMapClick = (event: MapLayerMouseEvent) => {
    const { mode, mouseEvents, map, store, tiles } = this.props;

    if (mode.getClosedGeometry()) return;
    if (this.#onOwnGeometryLayersClick(event)) return;
    if (mouseEvents.lastPointMouseClick) {
      mouseEvents.lastPointMouseClick = false;
    }
    map.getCanvasContainer().style.cursor = "grab";
    const addedStep = this.topologyManager.addPointToStore(event);

    FireEvents.addPoint({ ...addedStep, total: store.size }, map, mode);
    PointVisibility.setSinglePointHidden(event);
    tiles.render()
  };

  #onMoveLeftClickUp = (event: MapLayerMouseEvent) => {
    const mouseLeftClickUp = event.originalEvent.buttons === 0;
    if (mouseLeftClickUp) {
      this.#onPointMouseUp();
    }
  };

  #onMapMouseMove = throttle((event: MapLayerMouseEvent) => {
    const { mouseEvents } = this.props;

    if (mouseEvents.pointMouseDown) {
      this.pointState.setLastEvent(event);

      if (!this.pointState.getSelectedNode()) return;

      const { tiles } = this.props;
      this.#onMoveLeftClickUp(this.pointState.getLastEvent() as MapLayerMouseEvent);
      const auxPoints = this.topologyManager.getAuxPointsLatLng(this.pointState.getLastEvent() as MapLayerMouseEvent);
      tiles.renderOnMouseMove(this.pointState.getSelectedIdx() as number, event.lngLat, auxPoints);
    }
  }, 17);

  #onPointMouseEnter = (event: MapLayerMouseEvent) => {
    const { mouseEvents, map, store, options } = this.props;
    if (mouseEvents) {
      mouseEvents.pointMouseEnter = true;
      if (mouseEvents.pointMouseDown) return;
    }
    PointVisibility.setSinglePointHidden(event);
    const id = MapUtils.queryPointId(map, event.point);
    if (StoreHelpers.isLastPoint(store, options, id)) {
      mouseEvents.lastPointMouseEnter = true;
      mouseEvents.lastPointMouseLeave = false;
    }
    const step = store.findStepById(id);
    if (step) {
      this.pointState.setEnteredStep(step);
      FireEvents.enterPoint(Object.assign({}, step, { total: store.size }), map);
    }
  };

  #onPointMouseLeave = (event: MapLayerMouseEvent) => {
    const { mouseEvents, store, map, options } = this.props;

    if (mouseEvents) {
      mouseEvents.pointMouseEnter = false;
      if (event.originalEvent.buttons === 0) {
        mouseEvents.pointMouseLeave = true;
      }
      if (mouseEvents.pointMouseDown) return;
    }
    const id = MapUtils.queryPointId(map, event.point);
    if (StoreHelpers.isLastPoint(store, options, id)) {
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

  #storeEventsConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_MUTATED") {
      if (event.data.size === 0) {
        this.pointState.reset();
      }
    }
  };

  #mapModeConsumer = (event: DrawingModeChangeEvent) => {
    if (event.type === "BREAK_CHANGED" || event.type === "MODE_CHANGED") {
      this.pointState.reset();
    }
  };

  #hideLastPointPanel = () => {
    const { store, panel, options } = this.props;
    const selectedNode = this.pointState.getSelectedNode();

    if (!selectedNode?.val) return;

    if (StoreHelpers.isLastPoint(store, options, selectedNode.val.id)) {
      panel.hidePanel();
    }
  };

  #setSelectedNode = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { store, map } = this.props;

    const id = MapUtils.queryPointId(map, event.point);
    const node = store.findNodeById(id);

    if (node) {
      this.pointState.setSelectedNode(node);
    }
  };

  #onPointMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
    this.pointState.clearLastEvent();

    const { mouseEvents, map, store } = this.props;

    if ((event.originalEvent as { button: number }).button === 2) {
      this.#onPointRemove(event);
      return;
    }

    this.#setSelectedNode(event);
    event.preventDefault();

    removeTransparentLine(map);
    this.#hideLastPointPanel();

    const point = MapUtils.queryPoint(map, event.point);
    const geometryIndex = Spatial.getGeometryIndex(store, point?.properties.id);
    this.pointState.setSelectedIdx(geometryIndex);

    if (mouseEvents) {
      mouseEvents.pointMouseDown = true;
    }

    this.pointState.setStartCoordinates(event.lngLat);

    map.on("mousemove", this.#onMapMouseMove);
    map.on("touchmove", this.#onMapMouseMove);
  };

  #onPointMouseUp = () => {
    const { mouseEvents, store, panel, map, options } = this.props;

    map.off("mousemove", this.#onMapMouseMove);
    map.off("touchmove", this.#onMapMouseMove);

    mouseEvents.pointMouseUp = true;

    const selectedNode = this.pointState.getSelectedNode();
    const lastEvent = this.pointState.getLastEvent();
    const startCoordinates = this.pointState.getStartCoordinates();

    if (selectedNode && selectedNode.val) {
      if (lastEvent) {
        this.topologyManager.updateStore();
        this.pointState.clearLastEvent();
      }

      store.notify({
        type: "STORE_MUTATED",
        data: store
      });

      panel?.showPanel();

      FireEvents.movePoint(
        {
          id: selectedNode.val.id,
          total: store.size,
          end: { lat: selectedNode.val.lat, lng: selectedNode.val.lng },
          start: startCoordinates as LatLng,
        },
        map,
      );

      this.pointState.partialReset();
    }

    if (mouseEvents) {
      mouseEvents.pointMouseDown = false;
    }

    addTransparentLine(map, options);
  };
}