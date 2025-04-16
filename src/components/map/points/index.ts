import type { EventsProps, LatLng, Step } from "#types/index";
import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";

import { MapUtils, Spatial, throttle, uuidv4 } from "#utils/helpers";
import { ELAYERS } from "#utils/geo_constants";
import { ListNode, StoreHelpers } from "#store/index";

import { FireEvents } from "../helpers";
import { PointHelpers, PointVisibility } from "./helpers";
import { FirstPoint } from "./first-point";
import { removeTransparentLine, addTransparentLine, togglePointCircleRadius } from "../tiles/helpers";
import { AuxPoints } from "./aux-points";
import { StoreChangeEvent } from "#store/types";
import { DrawingModeChangeEvent } from "../mode/types";

export interface PrimaryPointEvents {
  onPointMouseEnter: (event: MapLayerMouseEvent) => void;
  onPointMouseLeave: (event: MapLayerMouseEvent) => void;
  onPointMouseDown: (event: MapLayerMouseEvent | MapTouchEvent) => void;
  onPointMouseUp: () => void;
  onMapMouseMove: (event: MapLayerMouseEvent) => void;
}

export class PointEvents {
  #props: EventsProps;
  #startCoordinates: LatLng | null;
  #enteredStep: Step | null;
  #selectedNode: ListNode | null;
  #selectedIdx: number | null;
  #firstPoint: FirstPoint | null;
  #auxPoints: AuxPoints | null;
  #isThrottled: boolean;
  #lastEvent: MapLayerMouseEvent | null;
  #events: PrimaryPointEvents

  constructor(props: EventsProps) {
    this.#props = props;
    this.#startCoordinates = null;
    this.#enteredStep = null;
    this.#selectedNode = null;
    this.#selectedIdx = null;
    this.#events = {
      onPointMouseEnter: this.#onPointMouseEnter,
      onPointMouseLeave: this.#onPointMouseLeave,
      onPointMouseDown: this.#onPointMouseDown,
      onPointMouseUp: this.#onPointMouseUp,
      onMapMouseMove: this.#onMapMouseMove,
    };
    this.#firstPoint = new FirstPoint(this.#props, this.#events);
    this.#auxPoints = new AuxPoints(this.#props, this.#events);
    this.#isThrottled = false;
    this.#lastEvent = null;
  }

  #initConsumers = () => {
    this.#props.mode.addObserver(this.#mapModeConsumer);
    this.#props.store.addObserver(this.#storeEventsConsumer);
  }

  #removeConsumers = () => {
    this.#props.mode.removeObserver(this.#mapModeConsumer);
    this.#props.store.removeObserver(this.#storeEventsConsumer);
  }

  initEvents = () => {
    const { map } = this.#props;
    map.on("click", this.#onMapClick);
    map.on("dblclick", this.#onMapDblClick);

    map.on("mouseenter", ELAYERS.PointsLayer, this.#onPointMouseEnter);
    map.on("mouseleave", ELAYERS.PointsLayer, this.#onPointMouseLeave);
    map.on("mousedown", ELAYERS.PointsLayer, this.#onPointMouseDown);
    map.on("mouseup", ELAYERS.PointsLayer, this.#onPointMouseUp);
    map.on("touchend", ELAYERS.PointsLayer, this.#onPointMouseUp);
    map.on("touchstart", ELAYERS.PointsLayer, this.#onPointMouseDown);

    this.#firstPoint?.initEvents();
    this.#initConsumers();
  };

  removeEvents = () => {
    const { map } = this.#props;
    map.off("click", this.#onMapClick);
    map.off("dblclick", this.#onMapDblClick);
    map.off("mousemove", this.#onMapMouseMove);

    map.off("mouseenter", ELAYERS.PointsLayer, this.#onPointMouseEnter);
    map.off("mouseleave", ELAYERS.PointsLayer, this.#onPointMouseLeave);
    map.off("mousedown", ELAYERS.PointsLayer, this.#onPointMouseDown);
    map.off("mouseup", ELAYERS.PointsLayer, this.#onPointMouseUp);

    this.#firstPoint?.removeEvents();
    this.#auxPoints?.removeEvents();
    this.#removeConsumers();
  };

  #onMapDblClick = (event: MapLayerMouseEvent) => {
    event.preventDefault();
  };

  #recalculateAuxiliaryPoints = (clickedNode: ListNode | null) => {
    const { store, options } = this.#props;

    const nextAuxNode = clickedNode?.next;
    const prevAuxNode = clickedNode?.prev;
    const nextPrimaryNode = clickedNode?.next?.next;
    const prevPrimaryNode = clickedNode?.prev?.prev;

    store.removeNodeById(nextAuxNode?.val?.id as string);
    store.removeNodeById(prevAuxNode?.val?.id as string);

    if (!Spatial.canBreakClosedGeometry(store, options)) {
      const auxPoint = PointHelpers.createAuxiliaryPoint(nextPrimaryNode?.val as Step, prevPrimaryNode?.val as Step);
      store.insert(auxPoint, prevPrimaryNode as ListNode);
    }
  }

  #onPointRemove = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { store, tiles, options, mouseEvents, map } = this.#props;

    if (store.size == 1) {
      store.reset();
    }

    const id = MapUtils.queryPointId(this.#props.map, event.point);
    const clickedNode = store.findNodeById(id);

    if (!clickedNode?.val?.isAuxiliary) {
      store.removeNodeById(id);
      if (options.pointGeneration === "auto") {
        this.#recalculateAuxiliaryPoints(clickedNode);
      }
      Spatial.switchToLineModeIfCan(this.#props);
      if (Spatial.canBreakClosedGeometry(store, options)) {
        togglePointCircleRadius(map, "default");
      }
      FireEvents.pointDoubleClick({ ...clickedNode?.val as Step, total: store.size }, this.#props.map);
      if (StoreHelpers.isLastPoint(store, options, id)) {
        mouseEvents.lastPointMouseClick = true;
        mouseEvents.lastPointMouseUp = false;
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
    const { mode, mouseEvents, map, options, store } = this.#props;

    if (mode.getClosedGeometry()) return;
    if (this.#onOwnGeometryLayersClick(event)) return;
    if (mouseEvents.lastPointMouseClick) {
      mouseEvents.lastPointMouseClick = false;
    }
    map.getCanvasContainer().style.cursor = "grab";
    const nextStep = { ...event.lngLat, id: uuidv4() };
    if (options.pointGeneration === "auto" && store?.tail?.val && store.size >= 1) {
      const auxPoint = PointHelpers.createAuxiliaryPoint(store.tail.val, nextStep);
      store.push(auxPoint);
    }
    const addedStep = PointHelpers.addPointToMap(event, this.#props);
    FireEvents.addPoint({ ...addedStep, total: store.size }, map, mode);
    PointVisibility.setSinglePointHidden(event);
  };

  #onMoveLeftClickUp = (event: MapLayerMouseEvent) => {
    const mouseLeftClickUp = event.originalEvent.buttons === 0;
    if (mouseLeftClickUp) {
      this.#onPointMouseUp();
    }
  };

  #getAuxPointsLatLng = (event: MapLayerMouseEvent) => {
    if (!this.#selectedNode) return null;

    const { options } = this.#props;
    const prevPrimary = this.#selectedNode?.prev?.prev;
    const nextPrimary = this.#selectedNode?.next?.next;

    if (options.pointGeneration === "auto") {
      return {
        next: nextPrimary ? PointHelpers.getMidpoint(nextPrimary?.val as LatLng, event.lngLat) : null,
        prev: prevPrimary ? PointHelpers.getMidpoint(event.lngLat, prevPrimary?.val as LatLng) : null,
      } as const
    }
    return null;
  }

  #onMapMouseMove = throttle((event: MapLayerMouseEvent) => {

    if (!this.#isThrottled) {
      this.#lastEvent = event;
      this.#isThrottled = true;

      requestAnimationFrame(() => {
        if (!this.#selectedNode || !this.#lastEvent) return;
        const { tiles } = this.#props;
        this.#onMoveLeftClickUp(this.#lastEvent);
        const auxPoints = this.#getAuxPointsLatLng(this.#lastEvent);
        tiles.renderOnMouseMove(this.#selectedIdx as number, event.lngLat, auxPoints);
        this.#isThrottled = false;
      });
    }
  }, 17);

  #onPointMouseEnter = (event: MapLayerMouseEvent) => {
    const { mouseEvents, map, store, options } = this.#props;
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
      this.#enteredStep = step;
      FireEvents.enterPoint(Object.assign({}, step, { total: store.size }), map);
    }
  };

  #onPointMouseLeave = (event: MapLayerMouseEvent) => {
    const { mouseEvents, store, map, options } = this.#props;

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
      Object.assign({}, this.#enteredStep, {
        total: store.size,
      }),
      map,
    );
  };

  #resetHelpers = () => {
    this.#selectedNode = null;
    this.#selectedIdx = null;
    this.#lastEvent = null;
    this.#startCoordinates = null;
    this.#enteredStep = null;
    this.#isThrottled = false;
  }

  #storeEventsConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_CHANGED") {
      if (event.data.size === 0) {
        this.#resetHelpers();
      }
    }
  };

  #mapModeConsumer = (event: DrawingModeChangeEvent) => {
    if (event.type === "BREAK_CHANGED" || event.type === "MODE_CHANGED") {
      this.#resetHelpers();
    }
  };

  #hideLastPointPanel = () => {
    const { store, panel, options } = this.#props;
    if (!this.#selectedNode || !this.#selectedNode.val) return;

    if (StoreHelpers.isLastPoint(store, options, this.#selectedNode.val.id)) {
      panel.hidePanel();
    }
  };

  #setSelectedNode = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { store, map } = this.#props;

    const id = MapUtils.queryPointId(map, event.point);
    const step = store.findNodeById(id);
    if (step) {
      this.#selectedNode = step;
    }
  };

  #onPointMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { mouseEvents, map, store } = this.#props;

    if ((event.originalEvent as { button: number }).button === 2) {
      this.#onPointRemove(event);
      return;
    }

    this.#setSelectedNode(event);
    event.preventDefault();

    removeTransparentLine(map);
    this.#hideLastPointPanel();
    const point = MapUtils.queryPoint(map, event.point)
    this.#selectedIdx = Spatial.getGeometryIndex(store, point?.properties.id);

    if (mouseEvents) {
      mouseEvents.pointMouseDown = true;
    }
    this.#startCoordinates = event.lngLat;
    map.on("mousemove", this.#onMapMouseMove);
    map.on("touchmove", this.#onMapMouseMove);
  };

  // we've got the reference to the selected node from the store and just updating the lat/lng when mouse up event happens
  #updateStore = () => {
    if (!this.#lastEvent) return;

    if (this.#selectedNode && this.#selectedNode.val) {
      this.#selectedNode.val.lat = this.#lastEvent?.lngLat.lat;
      this.#selectedNode.val.lng = this.#lastEvent.lngLat.lng;
      const auxPoints = this.#getAuxPointsLatLng(this.#lastEvent);

      if (auxPoints) {
        if (this.#selectedNode.prev?.val && auxPoints.prev) {
          this.#selectedNode.prev.val.lat = auxPoints.prev.lat;
          this.#selectedNode.prev.val.lng = auxPoints.prev.lng;
        }
        if (this.#selectedNode.next?.val && auxPoints.next) {
          this.#selectedNode.next.val.lat = auxPoints.next.lat;
          this.#selectedNode.next.val.lng = auxPoints.next.lng;
        }
      }
    }
  }

  #onPointMouseUp = () => {
    const { mouseEvents, store, panel, map, options } = this.#props;
    mouseEvents.pointMouseUp = true;
    if (this.#selectedNode && this.#selectedNode.val) {
      if (this.#lastEvent) {
        this.#updateStore();
      }
      store.notify({
        type: "STORE_CHANGED",
        data: store
      })
      panel?.showPanel();

      FireEvents.movePoint(
        {
          id: this.#selectedNode.val.id,
          total: store.size,
          end: { lat: this.#selectedNode.val.lat, lng: this.#selectedNode.val.lng },
          start: this.#startCoordinates as LatLng,
        },
        map,
      );
    }
    if (mouseEvents) {
      mouseEvents.pointMouseDown = false;
    }
    addTransparentLine(map, options);
    // if the event.originalEvent.buttons === 0 in mousemove didn't work, let's try on mouse up
    // but this is a fail safe, it should work on event.originalEvent.buttons
    map.off("mousemove", this.#onMapMouseMove);
    map.off("touchmove", this.#onMapMouseMove);
  };
}
