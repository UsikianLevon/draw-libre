import type { EventsCtx } from "#app/types/index";
import { LineEvents } from "./line";
import { PointEvents } from "./points";

export class Events {
  private pointEvents: PointEvents;
  private lineEvents: LineEvents;

  constructor(private readonly events: EventsCtx) {
    this.pointEvents = new PointEvents(events);
    this.lineEvents = new LineEvents(events);
    // TODO
    events.map.on("mode:initialize", this.initEvents);
    events.map.on("mode:remove", this.removeDrawEvents);
  }

  private initEvents = () => {
    this.lineEvents.init();
    this.pointEvents?.initEvents();
  };

  private removeDrawEvents = () => {
    this.pointEvents?.removeEvents();
    this.lineEvents?.remove();
  };

  public removeMapEventsAndConsumers = () => {
    this.pointEvents?.removeEvents();
    this.lineEvents?.remove();
    this.events.map.off("mode:initialize", this.initEvents);
    this.events.map.off("mode:remove", this.removeDrawEvents);
  };
}
