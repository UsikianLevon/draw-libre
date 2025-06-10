import type { MapEventsCtx } from "#app/types/index";
import { LineEvents } from "./line";
import { PointEvents } from "./points";

export class MapEvents {
  private pointEvents: PointEvents;
  private lineEvents: LineEvents;

  constructor(private readonly ctx: MapEventsCtx) {
    this.pointEvents = new PointEvents(this.ctx);
    this.lineEvents = new LineEvents(this.ctx);
    this.initEvents();
  }

  private initEvents = () => {
    this.lineEvents.init();
    this.pointEvents?.init();
  };

  public remove = () => {
    this.pointEvents?.remove();
    this.lineEvents?.remove();
  };
}
