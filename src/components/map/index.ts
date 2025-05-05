import type { EventsCtx } from "#app/types/index";
import { Renderer } from "#components/map/renderer";
import { ControlEvents } from "#components/side-control/events";
import { PanelEvents } from "#components/panel/events";
import { LineEvents } from "./line";
import { PointEvents } from "./points";

export class Events extends Renderer {
  private panelEvents: PanelEvents;
  private controlEvents: ControlEvents;
  private pointEvents: PointEvents;
  private lineEvents: LineEvents;

  constructor(private readonly events: EventsCtx) {
    super({ ...events });
    this.panelEvents = new PanelEvents(events);
    this.controlEvents = new ControlEvents(events);
    this.pointEvents = new PointEvents(events);
    this.lineEvents = new LineEvents(events);
    // TODO
    events.map.on("mode:initialize", this.initEvents);
    events.map.on("mode:remove", this.removeDrawEvents);
  }

  private initEvents = () => {
    this.lineEvents.init();
    this.panelEvents?.initEvents();
    this.panelEvents?.initConsumers();
    this.pointEvents?.initEvents();
  };

  private removeDrawEvents = () => {
    this.panelEvents?.removeEvents();
    this.panelEvents?.removeConsumers();
    this.pointEvents?.removeEvents();
    this.lineEvents?.remove();
  };

  public removeMapEventsAndConsumers = () => {
    this.panelEvents?.removeEvents();
    this.pointEvents?.removeEvents();
    this.controlEvents?.remove();
    this.lineEvents?.remove();
    this.events.map.off("mode:initialize", this.initEvents);
    this.events.map.off("mode:remove", this.removeDrawEvents);
  };
}
