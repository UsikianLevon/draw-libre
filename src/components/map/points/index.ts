import type { EventsProps, LatLng, Step } from "#types/index";
import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";

import { MapUtils, Spatial, throttle, uuidv4 } from "#utils/helpers";
import { ELAYERS } from "#utils/geo_constants";
import { ListNode, StoreHelpers } from "#store/index";

import { FireEvents } from "../helpers";
import { PointHelpers, PointVisibility } from "./helpers";
import { FirstPoint } from "./first-point";
import { removeTransparentLine, addTransparentLine, createDoubleClickDetector, togglePointCircleRadius } from "../tiles/helpers";

export class PointEvents {
  #props: EventsProps;
  #startCoordinates: LatLng | undefined;
  #enteredStep: Step | null;
  #selectedStep: Step | null;
  #selectedIdx: number | null;
  #firstPoint: FirstPoint | null;
  #isThrottled: boolean;
  #lastEvent: MapLayerMouseEvent | null;
  isDoubleClick: () => boolean;

  constructor(props: EventsProps) {
    this.#props = props;
    this.#startCoordinates = undefined;
    this.#enteredStep = null;
    this.#selectedStep = null;
    this.#selectedIdx = null;
    this.#firstPoint = new FirstPoint(this.#props)
    this.#isThrottled = false;
    this.#lastEvent = null;
    this.isDoubleClick = createDoubleClickDetector();
  }

  #initFirstPointEvents = () => {
    const { map } = this.#props;

    map.on("mouseenter", ELAYERS.FirstPointLayer, this.#onPointMouseEnter);
    map.on("mouseleave", ELAYERS.FirstPointLayer, this.#onPointMouseLeave);
    map.on("mousedown", ELAYERS.FirstPointLayer, this.#onPointMouseDown);
    map.on("mouseup", ELAYERS.FirstPointLayer, this.#onPointMouseUp);
    map.on("touchend", ELAYERS.FirstPointLayer, this.#onPointMouseUp);
    map.on("touchstart", ELAYERS.FirstPointLayer, this.#onPointMouseDown);

    this.#firstPoint?.initEvents();
  };

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

    this.#initFirstPointEvents();
  };

  #removeFirstPointEvents = () => {
    const { map } = this.#props;

    map.off("mouseenter", ELAYERS.FirstPointLayer, this.#onPointMouseEnter);
    map.off("mouseleave", ELAYERS.FirstPointLayer, this.#onPointMouseLeave);
    map.off("mousedown", ELAYERS.FirstPointLayer, this.#onPointMouseDown);
    map.off("mouseup", ELAYERS.FirstPointLayer, this.#onPointMouseUp);
    map.off("touchend", ELAYERS.PointsLayer, this.#onPointMouseUp);
    map.off("touchstart", ELAYERS.PointsLayer, this.#onPointMouseDown);
    this.#firstPoint?.removeEvents();
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

    this.#removeFirstPointEvents();
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
    const { store, tiles, options, mouseEvents } = this.#props;

    if (store.size == 1) {
      store.reset();
    }

    const id = MapUtils.queryPointId(this.#props.map, event.point);
    const clickedNode = store.findNodeById(id);

    store.removeNodeById(id);
    if (options.pointGeneration === "auto") {
      this.#recalculateAuxiliaryPoints(clickedNode);
    }
    Spatial.switchToLineModeIfCan(this.#props);
    FireEvents.pointDoubleClick({ ...clickedNode?.val as Step, total: store.size }, this.#props.map);
    if (StoreHelpers.isLastPoint(store, options, id)) {
      mouseEvents.lastPointMouseClick = true;
      mouseEvents.lastPointMouseUp = false;
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

  #onMapMouseMove = throttle((event: MapLayerMouseEvent) => {
    if (!this.#isThrottled) {
      this.#lastEvent = event;
      this.#isThrottled = true;

      requestAnimationFrame(() => {
        if (!this.#selectedStep || !this.#lastEvent) return;
        this.#selectedStep.lat = event.lngLat.lat;
        this.#selectedStep.lng = event.lngLat.lng;
        this.#onMoveLeftClickUp(this.#lastEvent);
        const { tiles } = this.#props;
        tiles.renderOnMouseMove(this.#selectedIdx as number, event.lngLat);
        this.#isThrottled = false;
      });
    }
  }, 22);

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

  #hideLastPointPanel = () => {
    const { store, panel, options } = this.#props;
    if (!this.#selectedStep) return;

    if (StoreHelpers.isLastPoint(store, options, this.#selectedStep.id)) {
      panel.hidePanel();
    }
  };

  #setSelectedStep = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { store, map } = this.#props;

    const id = MapUtils.queryPointId(map, event.point);
    const step = store.findStepById(id);
    if (step) {
      this.#selectedStep = step;
    }
  };

  #onPointMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
    const { mouseEvents, map, store } = this.#props;

    if ((event.originalEvent as { button: number }).button === 2) {
      this.#onPointRemove(event);
      return;
    }
    event.preventDefault();

    removeTransparentLine(map);
    this.#setSelectedStep(event);
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

  #onPointMouseUp = () => {
    const { mouseEvents, store, panel, map, options } = this.#props;
    mouseEvents.pointMouseUp = true;
    if (this.#selectedStep) {
      store.notify({
        type: "STORE_CHANGED",
        data: store
      })
      panel?.showPanel();

      FireEvents.movePoint(
        {
          id: this.#selectedStep.id,
          total: store.size,
          end: { lat: this.#selectedStep.lat, lng: this.#selectedStep.lng },
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
