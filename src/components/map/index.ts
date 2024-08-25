import type { EventsProps } from "#types/index";
import { Tiles } from "#components/map/tiles";
import { ControlEvents } from "#components/side-control/events";
import { PanelEvents } from "#components/last-point-panel/events";
import { LineEvents } from "./line";
import { PointEvents } from "./points";

export class Events extends Tiles {
  #props: EventsProps;
  #panelEvents: PanelEvents;
  #controlEvents: ControlEvents;
  #pointEvents: PointEvents;
  #lineEvents: LineEvents;

  constructor(props: EventsProps) {
    super({ ...props });
    this.#props = props;
    this.#panelEvents = new PanelEvents(props);
    this.#controlEvents = new ControlEvents(props);
    this.#pointEvents = new PointEvents(props);
    this.#lineEvents = new LineEvents(props);
    props.map.on("panel:ready", this.#initEvents);
  }

  #initEvents = () => {
    this.#panelEvents?.initEvents();
    this.#controlEvents?.initEvents();
    this.#pointEvents?.initEvents();
  };

  removeMapEventsAndConsumers = () => {
    this.#panelEvents?.removeEvents();
    this.#pointEvents?.removeEvents();
    this.#controlEvents?.remove();
    this.#lineEvents?.remove();
    this.#props.map.off("panel:ready", this.#initEvents);
  };
}
