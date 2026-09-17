import { DOM } from "#app/dom";
import type { ButtonType, PanelImpl } from "#app/types";
import { Context } from ".";

export class View {
  private root: HTMLDivElement;
  private buttonContainer: HTMLDivElement;
  private buttons: Partial<Record<ButtonType, HTMLButtonElement>> = {};

  constructor(private readonly ctx: Pick<Context, "map" | "options">) {
    this.root = DOM.create("div", "mdl-dashboard-container");
    this.root.setAttribute("data-type", "panel");
    this.buttonContainer = DOM.create("div", "mdl-dashboard", this.root);

    this.renderButtons();
    if (this.hasButtons()) ctx.map.getContainer().appendChild(this.root);
  }

  private createButton(type: ButtonType, title: string, size: PanelImpl["size"], container: HTMLElement) {
    const button = DOM.create("button", `mdl-panel-button mdl-panel-button-${size}`, container);
    button.setAttribute("data-type", type);
    button.setAttribute("aria-label", title);
    DOM.create("span", `mdl-icon mdl-icon-${type} mdl-icon-${size}`, button);
    return button as HTMLButtonElement;
  }

  private renderButtons() {
    const { panel, locale } = this.ctx.options;
    const { buttons, size } = panel;

    (Object.keys(buttons) as ButtonType[]).forEach((type) => {
      if (!buttons[type].visible) return;

      const button = this.createButton(type, locale[type], size, this.buttonContainer);
      if (type === "undo" || type === "redo") {
        DOM.disableButton(button);
      }

      this.buttons[type] = button;
    });
  }

  public getButton = (type: ButtonType): HTMLButtonElement | null => {
    return this.buttons[type] ?? null;
  };

  public hasButtons = (): boolean => {
    return Object.keys(this.buttons).length > 0;
  };

  public getRoot = (): HTMLDivElement => {
    return this.root;
  };

  public show = () => {
    this.root.classList.remove("mdl-hidden");
    this.root.removeAttribute("aria-hidden");
  };

  public hide = () => {
    this.root.classList.add("mdl-hidden");
    this.root.setAttribute("aria-hidden", "true");
  };

  public setTransform = (x: number, y: number) => {
    this.root.style.transform = `translate(${x}px, ${y}px)`;
  };

  public observeResize = (callback: ResizeObserverCallback): ResizeObserver => {
    const observer = new ResizeObserver(callback);
    observer.observe(this.root);
    return observer;
  };

  public destroy = () => {
    this.root.remove();
  };
}
