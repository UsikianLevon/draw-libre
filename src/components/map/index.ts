import type { EventsProps } from "#app/types/index";
import { Tiles } from "#components/map/tiles";
import { ControlEvents } from "#components/side-control/events";
import { PanelEvents } from "#components/panel/events";
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
    props.map.on("mode:initialize", this.#initEvents);
    props.map.on("mode:remove", this.#removeDrawEvents);
  }

  #initEvents = () => {
    this.#lineEvents.init();
    this.#panelEvents?.initEvents();
    this.#panelEvents?.initConsumers();
    this.#pointEvents?.initEvents();
  };

  #removeDrawEvents = () => {
    this.#panelEvents?.removeEvents();
    this.#panelEvents?.removeConsumers();
    this.#pointEvents?.removeEvents();
    this.#lineEvents?.remove();
  };

  removeMapEventsAndConsumers = () => {
    this.#panelEvents?.removeEvents();
    this.#pointEvents?.removeEvents();
    this.#controlEvents?.remove();
    this.#lineEvents?.remove();
    this.#props.map.off("mode:initialize", this.#initEvents);
  };
}
