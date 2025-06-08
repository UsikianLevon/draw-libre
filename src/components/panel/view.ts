import { DOM } from "#app/utils/dom";
import type { ButtonType, PanelImpl } from "#app/types";
import { disableButton } from "#app/utils/helpers";
import { Context } from ".";

export class PanelView {
  private root: HTMLDivElement;
  private buttonContainer: HTMLDivElement;
  private buttons: Partial<Record<ButtonType, HTMLButtonElement>> = {};

  constructor(private readonly ctx: Pick<Context, "map" | "options">) {
    this.root = DOM.create("div", "dashboard-container");
    this.buttonContainer = DOM.create("div", "dashboard", this.root);

    this.renderButtons();
    ctx.map.getContainer().appendChild(this.root);
  }

  private createButton(type: ButtonType, title: string, size: PanelImpl["size"], container: HTMLElement) {
    const button = DOM.create("button", `panel-button panel-button-${size}`, container);
    button.setAttribute("data-type", type);
    button.setAttribute("aria-label", title);
    DOM.create("span", `icon ${type} icon-${size}`, button);
    return button as HTMLButtonElement;
  }

  private renderButtons() {
    const { panel, locale } = this.ctx.options;
    const { buttons, size } = panel;

    (Object.keys(buttons) as ButtonType[]).forEach((type) => {
      if (!buttons[type].visible) return;

      const button = this.createButton(type, locale[type], size, this.buttonContainer);
      if (type === "undo" || type === "redo") {
        disableButton(button);
      }

      this.buttons[type] = button;
    });
  }

  public getButton(type: ButtonType): HTMLButtonElement | undefined {
    return this.buttons[type];
  }

  public getRoot(): HTMLDivElement {
    return this.root;
  }

  public show() {
    this.root.classList.remove("hidden");
  }

  public hide() {
    this.root.classList.add("hidden");
  }

  public setTransform(x: number, y: number) {
    this.root.style.transform = `translate(${x}px, ${y}px)`;
  }

  public observeResize(callback: ResizeObserverCallback): ResizeObserver {
    const observer = new ResizeObserver(callback);
    observer.observe(this.root);
    return observer;
  }

  public destroy() {
    this.root.remove();
  }
}
