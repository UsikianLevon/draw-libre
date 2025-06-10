import { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";

import type { ListNode } from "#app/store/index";
import type { MapEventsCtx } from "#app/types/index";
import { ELAYERS, ESOURCES } from "#app/utils/geo_constants";
import { GeometryFactory, throttle } from "#app/utils/helpers";
import { timeline } from "#app/history";

import { isOnLine } from "./utils";
import { FireEvents } from "../helpers";
import { BreakGeometryCommand } from "./commands/break-geometry";
import { renderer } from "../renderer";

const LINE_BREAK_THROTTLE_TIME = 15;

export class LineBreakEvents {
  private current: ListNode | null;
  private throttledOnLineEnter: (event: MapLayerMouseEvent) => void;

  constructor(private readonly ctx: MapEventsCtx) {
    this.current = null;
    this.throttledOnLineEnter = throttle(this.onLineEnterBreak, LINE_BREAK_THROTTLE_TIME);
  }

  public initBreakEvents = () => {
    this.ctx.map.on("click", ELAYERS.LineLayer, this.geometryBreakOnClick);
    this.ctx.map.on("mouseenter", ELAYERS.LineLayer, this.throttledOnLineEnter);
    this.ctx.map.on("mousemove", ELAYERS.LineLayer, this.throttledOnLineEnter);
    this.ctx.map.on("mouseleave", ELAYERS.LineLayer, this.onLineLeave);
  };

  public removeBreakEvents = () => {
    this.ctx.map.off("click", ELAYERS.LineLayer, this.geometryBreakOnClick);
    this.ctx.map.off("mouseenter", ELAYERS.LineLayer, this.throttledOnLineEnter);
    this.ctx.map.off("mousemove", ELAYERS.LineLayer, this.throttledOnLineEnter);
    this.ctx.map.off("mouseleave", ELAYERS.LineLayer, this.onLineLeave);
  };

  public hideBreakLine = () => {
    if (this.ctx.map.getLayoutProperty(ELAYERS.LineLayerBreak, "visibility") !== "none") {
      this.ctx.map.setLayoutProperty(ELAYERS.LineLayerBreak, "visibility", "none");
    }
  };

  public showBreakLine = () => {
    if (this.ctx.map.getLayoutProperty(ELAYERS.LineLayerBreak, "visibility") !== "visible") {
      this.ctx.map.setLayoutProperty(ELAYERS.LineLayerBreak, "visibility", "visible");
    }
  };

  private geometryBreakOnClick = (event: MapLayerMouseEvent) => {
    const { store, mode, map, options } = this.ctx;

    if (!this.current) return;
    timeline.commit(new BreakGeometryCommand(store, options, mode, this.current, event.lngLat));
    this.onLineLeave();
    mode.reset();
    renderer.execute();
    FireEvents.onLineBreak(map);
  };

  private getAutoGenerationPoints = (line: ListNode | null) => {
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
  };

  private getLinePoints = (line: ListNode | null) => {
    if (this.ctx.options.pointGeneration === "manual") {
      const current = [line?.val?.lng, line?.val?.lat] as [number, number];
      const next = [line?.next?.val?.lng, line?.next?.val?.lat] as [number, number];
      return { current, next };
    }

    return this.getAutoGenerationPoints(line);
  };

  private onLineEnterBreak = (event: MapLayerMouseEvent) => {
    const { map, store } = this.ctx;

    const line = isOnLine(event, store);
    if (line?.val?.id !== this.current?.val?.id) {
      this.current = line;
    }

    const lineSource = map.getSource(ESOURCES.LineSourceBreak) as GeoJSONSource;
    const { current, next } = this.getLinePoints(this.current);

    const lineBreakData = GeometryFactory.getLine(current, next);
    if (!lineBreakData) return;

    lineSource.setData(lineBreakData as any);
    this.showBreakLine();
  };

  private onLineLeave = () => {
    setTimeout(() => {
      this.hideBreakLine();
    }, LINE_BREAK_THROTTLE_TIME + 10);
  };
}
