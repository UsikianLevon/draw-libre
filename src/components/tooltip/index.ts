import { HTMLEvent } from "#app/types/helpers";
import { DOM } from "#app/dom";
import "./tooltip.css";

export type Placement = "left" | "right" | "bottom";

interface CreateOptions {
  label: string;
  placement: Placement;
}

const BASE_Y_OFFSET_FROM_ELEMENT = 8;
const BASE_X_OFFSET_FROM_ELEMENT = 8;

type Position = {
  x: number;
  y: number;
};

export class Tooltip {
  private container: HTMLElement | undefined;
  public label: HTMLElement | undefined;

  constructor() {
    this.container = undefined;
  }

  create = (options: CreateOptions) => {
    const container = DOM.create("div", "mdl-tooltip", document.body);
    const span = DOM.create("span", `mdl-tooltip-text mdl-tooltip-text-${options.placement}`, container);
    span.textContent = options.label;
    this.container = container;
    this.label = span;
    return this;
  };

  private activateAnimation = () => {
    this.label?.classList.add("mdl-tooltip-text-active");
  };

  private getLabelDimensions = () => {
    if (!this.label) return { width: 0, height: 0 };

    return {
      width: this.label.clientWidth,
      height: this.label.clientHeight,
    };
  };

  private getSidePosition = (event: HTMLEvent<HTMLElement>, side: "left" | "right"): Position => {
    const { bottom, left, right } = event.target.getBoundingClientRect();
    const { width: labelWidth, height: labelHeight } = this.getLabelDimensions();
    const y = bottom - labelHeight - 2;

    if (side === "right") {
      return { x: right + BASE_X_OFFSET_FROM_ELEMENT, y };
    }

    return { x: left - BASE_X_OFFSET_FROM_ELEMENT - labelWidth, y };
  };

  private getBottomPosition = (event: HTMLEvent<HTMLElement>): Position => {
    const { bottom, left, right } = event.target.getBoundingClientRect();
    const { width: labelWidth } = this.getLabelDimensions();

    const elementCenterX = (right - left) / 2 + left;
    return {
      x: elementCenterX - labelWidth / 2,
      y: bottom + BASE_Y_OFFSET_FROM_ELEMENT,
    };
  };

  // window coordinates, the container has fixed position
  getPosition = (event: HTMLEvent<HTMLElement>, position: Placement): Position => {
    if (position !== "bottom") {
      return this.getSidePosition(event, position);
    }

    return this.getBottomPosition(event);
  };

  setPosition = (pos: Position) => {
    const { x, y } = pos;
    if (this.container) {
      this.container.style.left = `${x}px`;
      this.container.style.top = `${y}px`;
    }
    this.activateAnimation();
  };

  remove = () => {
    if (this.container) {
      DOM.remove(this.container);
    }
  };
}
