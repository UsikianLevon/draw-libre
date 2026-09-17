import { DOM } from "#app/dom";

const BUTTON_CLASS = "mdl-point-remove";
const HIDDEN_CLASS = "mdl-hidden";

export type Side = "left" | "right";

export class RemoveButtonView {
  private readonly button: HTMLButtonElement;

  constructor(container: HTMLElement, label: string) {
    this.button = DOM.create("button", `${BUTTON_CLASS} ${HIDDEN_CLASS}`, container);
    this.button.type = "button";
    this.button.setAttribute("data-type", "remove-point");
    this.button.setAttribute("aria-label", label);
  }

  public getElement = (): HTMLButtonElement => this.button;

  public getWidth = (): number => this.button.offsetWidth;

  public setPosition = (x: number, y: number, side: Side) => {
    const selfShift = side === "right" ? "0, -50%" : "-100%, -50%";
    this.button.style.transform = `translate(${x}px, ${y}px) translate(${selfShift})`;
    this.button.dataset.side = side;
  };

  public show = () => DOM.removeClassName(this.button, HIDDEN_CLASS);

  public hide = () => DOM.addClassName(this.button, HIDDEN_CLASS);

  public destroy = () => DOM.remove(this.button);
}
