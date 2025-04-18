import { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";

import { ListNode } from "#store/index";
import type { EventsProps, Uuid } from "#types/index";
import { ELAYERS, ESOURCES } from "#utils/geo_constants";
import { GeometryFactory, Spatial, throttle } from "#utils/helpers";

import { isOnLine } from "./utils";
import { FireEvents } from "../helpers";

const LINE_BREAK_THROTTLE_TIME = 15;

export class LineBreakEvents {
  props: EventsProps;
  #current: ListNode | null;
  #throttledOnLineEnter: (event: MapLayerMouseEvent) => void;

  constructor(props: EventsProps) {
    this.props = props;
    this.#current = null;
    this.#throttledOnLineEnter = throttle(this.#onLineEnterBreak, LINE_BREAK_THROTTLE_TIME);
  }

  initBreakEvents = () => {
    const { map } = this.props;

    map.on("click", ELAYERS.LineLayerTransparent, this.#geometryBreakOnClick);
    map.on("mouseenter", ELAYERS.LineLayerTransparent, this.#throttledOnLineEnter);
    map.on("mousemove", ELAYERS.LineLayerTransparent, this.#throttledOnLineEnter);
    map.on("mouseleave", ELAYERS.LineLayerTransparent, this.#onLineLeave);
  };

  removeBreakEvents = () => {
    const { map } = this.props;

    map.off("click", ELAYERS.LineLayerTransparent, this.#geometryBreakOnClick);
    map.off("mouseenter", ELAYERS.LineLayerTransparent, this.#throttledOnLineEnter);
    map.off("mousemove", ELAYERS.LineLayerTransparent, this.#throttledOnLineEnter);
    map.off("mouseleave", ELAYERS.LineLayerTransparent, this.#onLineLeave);
  };

  hideBreakLine = () => {
    const { map } = this.props;

    if (map.getLayoutProperty(ELAYERS.LineLayerBreak, "visibility") !== "none") {
      map.setLayoutProperty(ELAYERS.LineLayerBreak, "visibility", "none");
    }
  };

  showBreakLine = () => {
    const { map } = this.props;

    if (map.getLayoutProperty(ELAYERS.LineLayerBreak, "visibility") !== "visible") {
      map.setLayoutProperty(ELAYERS.LineLayerBreak, "visibility", "visible");
    }
  };

  #geometryBreakOnClick = () => {
    const { store, mode, map, tiles, options } = this.props;

    if (!this.#current) return;

    Spatial.breakGeometry(store, options, this.#current);
    this.#onLineLeave();
    mode.reset();
    tiles.render();
    store.notify({
      type: "STORE_DETACHED",
      data: null
    })
    FireEvents.onLineBreak(map);
  };

  #getAutoGenerationPoints = (line: ListNode | null) => {
    let current: [number, number] | null = null;
    let next: [number, number] | null = null;

    if (line?.val?.isAuxiliary) {
      current = [line?.prev?.val?.lng, line?.prev?.val?.lat] as [number, number];
      next = [line?.next?.val?.lng, line?.next?.val?.lat] as [number, number];
    } else {
      current = [line?.val?.lng, line?.val?.lat] as [number, number];
      next = [line?.next?.next?.val?.lng, line?.next?.next?.val?.lat] as [number, number];
    }
    return { current, next };
  }

  #getLinePoints = (line: ListNode | null) => {
    const { options } = this.props;
    if (options.pointGeneration === "manual") {
      const current = [line?.val?.lng, line?.val?.lat] as [number, number];
      const next = [line?.next?.val?.lng, line?.next?.val?.lat] as [number, number];
      return { current, next };
    }

    return this.#getAutoGenerationPoints(line);
  }

  #onLineEnterBreak = (event: MapLayerMouseEvent) => {
    const { map, store } = this.props;

    const line = isOnLine(event, store);
    if (line?.val?.id !== this.#current?.val?.id) {
      this.#current = line;
    }

    const lineSource = map.getSource(ESOURCES.LineSourceBreak) as GeoJSONSource;
    const { current, next } = this.#getLinePoints(this.#current);

    const lineBreakData = GeometryFactory.getLine(current, next);
    if (!lineBreakData) return;

    lineSource.setData(lineBreakData as any);
    this.showBreakLine();
  };

  #onLineLeave = () => {
    setTimeout(() => {
      this.hideBreakLine();
    }, LINE_BREAK_THROTTLE_TIME + 10);
  };
}
