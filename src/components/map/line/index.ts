import type { EventsCtx } from "#app/types/index";
import { MOBILE_WIDTH } from "#app/utils/constants";
import type { DrawingModeChangeEvent } from "../mode/types";
import type { MouseEventsChangeEvent } from "../mouse-events/types";
import { LineBreakEvents } from "./break-line";
import { DynamicLineEvents } from "./dynamic-line";
import { TransparentLineEvents } from "./transparent-line";

export class LineEvents {
  private break: LineBreakEvents;
  private transparent: TransparentLineEvents | null;
  private dynamic: DynamicLineEvents | null;
  private type: "default" | "break";

  constructor(private readonly ctx: EventsCtx) {
    this.break = new LineBreakEvents(ctx);
    this.transparent = ctx.options.pointGeneration === "manual" ? new TransparentLineEvents(ctx) : null;
    this.dynamic = null;
    this.type = "default";
  }

  init() {
    this.initDynamicLine();
    this.initEvents();
    this.initConsumers();
  }

  private initDynamicLine = () => {
    if (window.innerWidth <= MOBILE_WIDTH) return;
    if (this.ctx.options.dynamicLine) {
      this.dynamic = new DynamicLineEvents(this.ctx);
    }
  };

  private initEvents() {
    const notBreakMode = !this.ctx.mode.getBreak();
    if (notBreakMode) {
      this.transparent?.initEvents();
    }
  }

  private initConsumers() {
    this.ctx.mode.addObserver(this.mapModeConsumer);
    this.ctx.mouseEvents.addObserver(this.mouseEventsConsumer);
  }

  remove() {
    this.removeConsumers();
    this.removeEvents();
  }

  private removeConsumers() {
    this.ctx.mode.removeObserver(this.mapModeConsumer);
    this.ctx.mouseEvents.removeObserver(this.mouseEventsConsumer);
    if (this.ctx.options.dynamicLine) {
      this.dynamic?.removeConsumers();
    }
  }

  private removeEvents() {
    this.break.removeBreakEvents();
    this.transparent?.removeEvents();
    if (this.ctx.options.dynamicLine) {
      this.dynamic?.removeEvents();
      this.dynamic?.hide();
    }
  }

  private mouseEventsConsumer = (event: MouseEventsChangeEvent) => {
    const { type, data } = event;
    const { mode } = this.ctx;
    if (!data || !mode.getBreak()) return;

    switch (type) {
      case "pointMouseDown":
        this.break.removeBreakEvents();
        this.break.hideBreakLine();
        break;
      case "pointMouseUp":
        this.break.initBreakEvents();
        break;
      default:
        break;
    }
  };

  private mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { type, data } = event;

    if (type === "MODE_CHANGED") {
      if (this.type === "break") {
        this.break.removeBreakEvents();
        this.transparent?.initEvents();
        this.type = "default";
      }
    }

    if (type === "BREAK_CHANGED" && data) {
      if (this.type === "default") {
        this.transparent?.removeEvents();
        this.break.initBreakEvents();
        this.type = "break";
      }
    }
  };
}
