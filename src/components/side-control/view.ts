import { DOM } from "#app/utils/dom";
import type { RequiredDrawOptions } from "#app/types";
import type { DrawingMode } from "#components/map/mode";
import { disableButton } from "#app/utils/helpers";

interface ControlViewCtx {
  options: RequiredDrawOptions;
  mode: DrawingMode;
}

export class View {
  private root: HTMLDivElement;
  public lineButton: HTMLButtonElement | undefined;
  public polygonButton: HTMLButtonElement | undefined;
  public breakButton: HTMLButtonElement | undefined;

  constructor(private readonly ctx: ControlViewCtx) {
    this.root = DOM.create("div", "mapboxgl-ctrl mapboxgl-ctrl-group maplibregl-ctrl maplibregl-ctrl-group");
    this.createControl();
  }

  createControlButton = (
    type: "line" | "polygon" | "break",
    title: string,
    active: boolean,
    disabled?: boolean,
  ): HTMLButtonElement => {
    const size = this.ctx.options.panel.size;
    const button = DOM.create("button", `control-button control-button-${size}`, this.root);
    button.setAttribute("aria-label", title);
    button.setAttribute("data-type", type);
    if (active) {
      button.classList.add("control-button-active");
    }
    if (disabled) {
      disableButton(button);
    }
    DOM.create("span", `icon ${type} icon-medium`, button);
    return button;
  };

  private createLineButton = () => {
    const { mode, options } = this.ctx;
    const lineVisible = this.ctx.options.modes.line.visible;
    const lineTitle = options.locale.line;
    if (lineVisible) {
      this.lineButton = this.createControlButton("line", lineTitle, mode.getMode() === "line");
    }
  };

  private createPolygonButton = () => {
    const { mode, options } = this.ctx;

    const polygonVisible = this.ctx.options.modes.polygon.visible;
    const polygonTitle = options.locale.polygon;
    if (polygonVisible) {
      this.polygonButton = this.createControlButton("polygon", polygonTitle, mode.getMode() === "polygon");
    }
  };

  private createBreakButton = () => {
    const { mode, options } = this.ctx;

    const breakVisible = this.ctx.options.modes.breakGeometry.visible;
    const breakTitle = options.locale.break;
    if (breakVisible) {
      const closedGeometry = this.ctx.options.initial?.closeGeometry;
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

  public getContainer = (): HTMLDivElement => {
    return this.root;
  };

  public destroy = () => {
    this.root.remove();
    this.breakButton?.remove();
    this.polygonButton?.remove();
    this.lineButton?.remove();
  };
}
