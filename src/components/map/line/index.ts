import type { EventsProps } from "#app/types/index";
import { MOBILE_WIDTH } from "#app/utils/constants";
import { DrawingModeChangeEvent } from "../mode/types";
import { MouseEventsChangeEvent } from "../mouse-events/types";
import { LineBreakEvents } from "./break-line";
import { DynamicLineEvents } from "./dynamic-line";
import { TransparentLineEvents } from "./transparent-line";

export class LineEvents {
  props: EventsProps;
  #break: LineBreakEvents;
  #transparent: TransparentLineEvents | null;
  #dynamic: DynamicLineEvents | null;
  #type: "default" | "break";

  constructor(props: EventsProps) {
    this.props = props;
    this.#break = new LineBreakEvents(props);
    this.#transparent = props.options.pointGeneration === "manual" ? new TransparentLineEvents(props) : null;
    this.#dynamic = null;
    this.#type = "default";
  }

  init() {
    this.#initDynamicLine();
    this.#initEvents();
    this.#initConsumers();
  }

  #initDynamicLine = () => {
    if (window.innerWidth <= MOBILE_WIDTH) return;
    if (this.props.options.dynamicLine) {
      this.#dynamic = new DynamicLineEvents(this.props);
    }
  };

  #initEvents() {
    const notBreakMode = !this.props.mode.getBreak();
    if (notBreakMode) {
      this.#transparent?.initEvents();
      if (this.props.options.dynamicLine) {
        this.#dynamic?.initDynamicEvents();
      }
    }
  }

  #initConsumers() {
    this.props.mode.addObserver(this.#mapModeConsumer);
    this.props.mouseEvents.addObserver(this.#mouseEventsConsumer);
  }

  remove() {
    this.#removeConsumers();
    this.#removeEvents();
  }

  #removeConsumers() {
    this.props.mode.removeObserver(this.#mapModeConsumer);
    this.props.mouseEvents.removeObserver(this.#mouseEventsConsumer);
    if (this.props.options.dynamicLine) {
      this.#dynamic?.removeConsumers();
    }
  }

  #removeEvents() {
    this.#break.removeBreakEvents();
    this.#transparent?.removeEvents();
    if (this.props.options.dynamicLine) {
      this.#dynamic?.removeEvents();
      this.#dynamic?.removeLine();
    }
  }

  #mouseEventsConsumer = (event: MouseEventsChangeEvent) => {
    const { type, data } = event;
    const { mode } = this.props;
    if (!data || !mode.getBreak()) return;

    switch (type) {
      case "pointMouseDown":
        this.#break.removeBreakEvents();
        this.#break.hideBreakLine();
        break;
      case "pointMouseUp":
        this.#break.initBreakEvents();
        break;
      default:
        break;
    }
  };

  #mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { type, data } = event;

    if (type === "MODE_CHANGED") {
      if (this.#type === "break") {
        this.#break.removeBreakEvents();
        this.#transparent?.initEvents();
        this.#type = "default";
      }
    }

    if (type === "BREAK_CHANGED" && data) {
      if (this.#type === "default") {
        this.#transparent?.removeEvents();
        this.#break.initBreakEvents();
        this.#type = "break";
      }
    }
  };
}
