import type { RequiredDrawOptions } from "#types/index";
import { DOM } from "#utils/dom";
import { DrawingMode } from "#components/map/mode";
import "./control.css";

interface ControlProps {
  options: RequiredDrawOptions;
  mode: DrawingMode;
}

export class Control {
  #defaultOptions: RequiredDrawOptions;
  _line: HTMLButtonElement | undefined;
  _polygon: HTMLButtonElement | undefined;
  _break: HTMLButtonElement | undefined;
  _container: HTMLElement;
  constructor(props: ControlProps) {
    this.#defaultOptions = props.options;
    this._line = undefined;
    this._polygon = undefined;
    this._break = undefined;
    this._container = DOM.create("div", "mapboxgl-ctrl mapboxgl-ctrl-group maplibregl-ctrl maplibregl-ctrl-group");
    this.createControl(props);
  }

  createControlButton = (
    type: "line" | "polygon" | "break",
    title: string,
    active: boolean,
    disabled?: boolean,
  ): HTMLButtonElement => {
    const size = this.#defaultOptions.panel.size;
    const button = DOM.create("button", `control-button control-button-${size}`, this._container);
    button.setAttribute("aria-label", title);
    button.setAttribute("data-type", type);
    if (active) {
      button.classList.add("control-button-active");
    }
    if (disabled) {
      button.setAttribute("disabled", "true");
      button.setAttribute("aria-disabled", "true");
    }
    DOM.create("span", `icon ${type} icon-${size}`, button);
    return button;
  };

  #createLineButton = (context: ControlProps) => {
    const { mode, options } = context;
    const lineVisible = this.#defaultOptions.modes.line.visible;
    const lineTitle = options.locale.line;
    if (lineVisible) {
      this._line = this.createControlButton("line", lineTitle, mode.getMode() === "line");
    }
  };

  #createPolygonButton = (context: ControlProps) => {
    const { mode, options } = context;

    const polygonVisible = this.#defaultOptions.modes.polygon.visible;
    const polygonTitle = options.locale.polygon;
    if (polygonVisible) {
      this._polygon = this.createControlButton("polygon", polygonTitle, mode.getMode() === "polygon");
    }
  };

  #createBreakButton = (context: ControlProps) => {
    const { mode, options } = context;

    const breakVisible = this.#defaultOptions.modes.breakGeometry.visible;
    const breakTitle = options.locale.break;
    if (breakVisible) {
      const closedGeometry = this.#defaultOptions?.initial?.closeGeometry;
      const disabled = !closedGeometry;
      const isBreak = mode.getBreak();
      this._break = this.createControlButton("break", breakTitle, isBreak, disabled);
    }
  };

  createControl = (context: ControlProps) => {
    this.#createLineButton(context);
    this.#createPolygonButton(context);
    this.#createBreakButton(context);
  };

  getContainer = () => {
    return this._container;
  };
}
