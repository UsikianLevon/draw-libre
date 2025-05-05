import type { RequiredDrawOptions } from "#app/types/index";
import { DOM } from "#app/utils/dom";
import { DrawingMode } from "#components/map/mode";
import "./control.css";

interface ControlProps {
  options: RequiredDrawOptions;
  mode: DrawingMode;
}

export class Control {
  public lineButton: HTMLButtonElement | undefined;
  public polygonButton: HTMLButtonElement | undefined;
  public breakButton: HTMLButtonElement | undefined;
  private container: HTMLElement;
  constructor(private readonly props: ControlProps) {
    this.lineButton = undefined;
    this.polygonButton = undefined;
    this.breakButton = undefined;
    this.container = DOM.create("div", "mapboxgl-ctrl mapboxgl-ctrl-group maplibregl-ctrl maplibregl-ctrl-group");
    this.createControl();
  }

  createControlButton = (
    type: "line" | "polygon" | "break",
    title: string,
    active: boolean,
    disabled?: boolean,
  ): HTMLButtonElement => {
    const size = this.props.options.panel.size;
    const button = DOM.create("button", `control-button control-button-${size}`, this.container);
    button.setAttribute("aria-label", title);
    button.setAttribute("data-type", type);
    if (active) {
      button.classList.add("control-button-active");
    }
    if (disabled) {
      button.setAttribute("disabled", "true");
      button.setAttribute("aria-disabled", "true");
    }
    DOM.create("span", `icon ${type} icon-medium`, button);
    return button;
  };

  private createLineButton = () => {
    const { mode, options } = this.props;
    const lineVisible = this.props.options.modes.line.visible;
    const lineTitle = options.locale.line;
    if (lineVisible) {
      this.lineButton = this.createControlButton("line", lineTitle, mode.getMode() === "line");
    }
  };

  private createPolygonButton = () => {
    const { mode, options } = this.props;

    const polygonVisible = this.props.options.modes.polygon.visible;
    const polygonTitle = options.locale.polygon;
    if (polygonVisible) {
      this.polygonButton = this.createControlButton("polygon", polygonTitle, mode.getMode() === "polygon");
    }
  };

  private createBreakButton = () => {
    const { mode, options } = this.props;

    const breakVisible = this.props.options.modes.breakGeometry.visible;
    const breakTitle = options.locale.break;
    if (breakVisible) {
      const closedGeometry = this.props.options.initial?.closeGeometry;
      const disabled = !closedGeometry;
      const isBreak = mode.getBreak();
      this.breakButton = this.createControlButton("break", breakTitle, isBreak, disabled);
    }
  };

  private createControl = () => {
    this.createLineButton();
    this.createPolygonButton();
    this.createBreakButton();
  };

  public getContainer = () => {
    return this.container;
  };
}
