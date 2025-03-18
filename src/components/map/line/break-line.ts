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

  // TODO
  #geometryBreakOnClick = () => {
    const { store, mode, panel, map, tiles } = this.props;

    const nextPointId = this.#current?.next?.val?.id as Uuid;
    Spatial.breakGeometry(store, nextPointId);
    if (store.tail?.val) {
      panel.setPanelLocation({
        lat: store.tail?.val?.lat,
        lng: store.tail?.val?.lng,
      });
    }
    this.#onLineLeave();

    map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "none");
    mode.reset();
    tiles.render();
    FireEvents.onLineBreak(map);
  };

  // TODO
  #onLineEnterBreak = (event: MapLayerMouseEvent) => {
    const { map, store } = this.props;

    const line = isOnLine(event, store);
    if (line?.val?.id !== this.#current?.val?.id) {
      this.#current = line;
    }

    const lineSource = map.getSource(ESOURCES.LineSourceBreak) as GeoJSONSource;

    const current = [line?.val?.lng, line?.val?.lat] as [number, number];
    const next = [line?.next?.val?.lng, line?.next?.val?.lat] as [number, number];
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
