import { HTMLEvent } from "#app/types/helpers";
import { DOM } from "#app/utils/dom";
import "./tooltip.css";

interface CreateOptions {
  label: string;
  placement: "left" | "bottom";
}

const BASE_Y_OFFSET_FROM_ELEMENT = 8;
const BASE_X_OFFSET_FROM_ELEMENT = 8;

type Position = {
  x: number;
  y: number;
};

export class Tooltip {
  _container: HTMLElement | undefined;
  _label: HTMLElement | undefined;

  constructor() {
    this._container = undefined;
  }

  create = (options: CreateOptions) => {
    const container = DOM.create("div", "popup-container", document.body);
    const span = DOM.create("span", `popup-text popup-text-${options.placement}`, container);
    span.textContent = options.label;
    this._container = container;
    this._label = span;
    return this;
  };

  #activateAnimation = () => {
    const notActive = !this._label?.classList.value.includes("popup-text-active");
    if (notActive) {
      this._label?.classList.add("popup-text-active");
    }
  };

  #getLabelDimensions = () => {
    if (!this._label) return { width: 0, height: 0 };

    return {
      width: this._label.clientWidth,
      height: this._label.clientHeight,
    };
  };

  #getLeftPosition = (event: HTMLEvent<HTMLElement>): Position => {
    const { bottom, left } = event.target.getBoundingClientRect();
    const { width: labelWidth, height: labelHeight } = this.#getLabelDimensions();

    return {
      x: left - BASE_X_OFFSET_FROM_ELEMENT - labelWidth,
      y: bottom - labelHeight - 2,
    };
  };

  #getBottomPosition = (event: HTMLEvent<HTMLElement>): Position => {
    const { bottom, left, right } = event.target.getBoundingClientRect();
    const { width: labelWidth } = this.#getLabelDimensions();

    const elementCenterX = (right - left) / 2 + left;
    return {
      x: elementCenterX - labelWidth / 2,
      y: bottom + BASE_Y_OFFSET_FROM_ELEMENT,
    };
  };

  getPosition = (event: HTMLEvent<HTMLElement>, position: "left" | "bottom"): Position => {
    if (position === "left") {
      return this.#getLeftPosition(event);
    }

    return this.#getBottomPosition(event);
  };

  setPosition = (pos: Position) => {
    const { x, y } = pos;
    if (this._container) {
      this._container.style.left = `${x}px`;
      this._container.style.top = `${y}px`;
    }
    this.#activateAnimation();
  };

  remove = () => {
    if (this._container) {
      DOM.remove(this._container);
    }
  };
}
