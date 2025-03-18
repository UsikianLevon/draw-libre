import { FireEvents } from "#components/map/helpers";
import { DrawingModeChangeEvent, Mode } from "#components/map/mode/types";
import { EventsProps } from "#types/index";

export class ControlObserver {
  #props: EventsProps;
  constructor(props: EventsProps) {
    this.#props = props;
    this.#initConsumers();
  }

  #initConsumers = () => {
    this.#props.mode.addObserver(this.#mapModeConsumer);
  };

  removeConsumers = () => {
    this.#props.mode.removeObserver(this.#mapModeConsumer);
  };

  #resetAllState = () => {
    const { _line, _polygon, _break } = this.#props.control;

    _line?.classList.remove("control-button-active");
    _polygon?.classList.remove("control-button-active");
    _break?.classList.remove("control-button-active");
  };

  #checkActive = (button: HTMLElement) => {
    this.#resetAllState();
    button.classList.add("control-button-active");
  };

  #observeModeChange = (event: DrawingModeChangeEvent) => {
    const { data } = event;
    const { _line, _polygon, _break } = this.#props.control;
    const { mode } = this.#props;
    FireEvents.modeChanged(this.#props.map, data as Mode);

    if (!_line || !_polygon || !_break) return;

    switch (data) {
      case "line":
        this.#checkActive(_line);
        break;
      case "polygon":
        this.#checkActive(_polygon);
        break;
      default:
        break;
    }

    if (!data) {
      this.#disableButton(_break);
    } else {
      if (mode.getClosedGeometry()) {
        this.#enableButton(_break);
      }
    }
  };

  #disableButton = (button: HTMLButtonElement) => {
    button.setAttribute("disabled", "true");
    button.setAttribute("aria-disabled", "true");
  };

  #enableButton = (button: HTMLButtonElement) => {
    button.removeAttribute("disabled");
    button.removeAttribute("aria-disabled");
  };

  #observeGeometryChange = (event: DrawingModeChangeEvent) => {
    const { data } = event;
    const { _break, _line, _polygon } = this.#props.control;
    const { mode } = this.#props;

    if (data) {
      if (_break) {
        this.#enableButton(_break);
      }
      if (mode.getMode() === "polygon") {
        if (_line) {
          this.#disableButton(_line);
        }
      }
      if (mode.getMode() === "line") {
        if (_polygon) {
          this.#disableButton(_polygon);
        }
      }
    } else {
      if (_break) {
        this.#disableButton(_break);
      }
      if (mode.getMode() === "polygon") {
        if (_line) {
          this.#enableButton(_line);
        }
      }
      if (mode.getMode() === "line") {
        if (_polygon) {
          this.#enableButton(_polygon);
        }
      }
    }
  };

  #mapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { type, data } = event;

    if (type === "MODE_CHANGED") {
      this.#observeModeChange(event);
    }
    if (type === "CLOSED_GEOMETRY_CHANGED") {
      this.#observeGeometryChange(event);
    }
    if (type === "BREAK_CHANGED" && data) {
      const { _break } = this.#props.control;
      this.#checkActive(_break as HTMLElement);
      FireEvents.modeChanged(this.#props.map, "break");
    }
  };
}
