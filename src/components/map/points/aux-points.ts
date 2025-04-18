import { ListNode } from "#store/index";
import type { EventsProps, Step } from "#types/index";
import { ELAYERS } from "#utils/geo_constants";
import { MapUtils } from "#utils/helpers";
import type { MapLayerMouseEvent, MapTouchEvent } from "maplibre-gl";
import { PointHelpers } from "./helpers";
import type { PrimaryPointEvents } from ".";

export class AuxPoints {
    #props: EventsProps;
    #events: PrimaryPointEvents;


    constructor(props: EventsProps, baseEvents: PrimaryPointEvents) {
        this.#props = props;
        this.#events = baseEvents;
        this.#initEvents()
    }

    #initBaseEvents = () => {
        const { map } = this.#props;

        map.on("mouseenter", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseEnter);
        map.on("mouseleave", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseLeave);
        map.on("mousedown", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseDown);
        map.on("mouseup", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseUp);
        map.on("touchend", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseUp);
        map.on("touchstart", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseDown);
    }

    #removeBaseEvents = () => {
        const { map } = this.#props;

        map.off("mouseenter", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseEnter);
        map.off("mouseleave", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseLeave);
        map.off("mousedown", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseDown);
        map.off("mouseup", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseUp);
        map.off("touchend", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseUp);
        map.off("touchstart", ELAYERS.AuxiliaryPointLayer, this.#events.onPointMouseDown);
    };

    #initEvents() {
        const { map } = this.#props;

        map.on("mousedown", ELAYERS.AuxiliaryPointLayer, this.#onMouseDown);
        map.on("touchstart", ELAYERS.AuxiliaryPointLayer, this.#onMouseDown);
        // PointsLayer because we need to check if the point was the primary point
        map.on("mousedown", ELAYERS.PointsLayer, this.#onPrimaryPointMouseDown);
        map.on("touchstart", ELAYERS.PointsLayer, this.#onPrimaryPointMouseDown);
        // PointsLayer becasue aux is already false
        this.#initBaseEvents();
    }

    removeEvents() {
        const { map } = this.#props;
        map.off("mousedown", ELAYERS.AuxiliaryPointLayer, this.#onMouseDown);
        map.off("touchstart", ELAYERS.AuxiliaryPointLayer, this.#onMouseDown);
        map.off("mousedown", ELAYERS.PointsLayer, this.#onPrimaryPointMouseDown);
        map.off("touchstart", ELAYERS.PointsLayer, this.#onPrimaryPointMouseDown);

        this.#removeBaseEvents();
    }

    #addTwoAuxiliaryPoints = (clickedNode: ListNode | null) => {
        if (!clickedNode) return;

        const { store } = this.#props;

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
    }

    #onPrimaryPointMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
        event.preventDefault()
    }

    #onMouseDown = (event: MapLayerMouseEvent | MapTouchEvent) => {
        const { store, tiles, map } = this.#props;
        // right click
        if ((event.originalEvent as { button: number }).button === 2) {
            return;
        }
        const id = MapUtils.queryPointId(map, event.point);
        const node = store.findNodeById(id);
        if (node && node.val) {
            node.val.isAuxiliary = false;
            this.#addTwoAuxiliaryPoints(node);
        }
        tiles.render()
    }
}