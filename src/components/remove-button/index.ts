import { DOM } from "#app/dom";
import type { RequiredDrawOptions, Step, StepId } from "#app/types/index";
import type { EngineMap } from "#app/types/engine";

import { RemoveButtonView } from "./view";
import "./remove-button.css";

const MIN_OFFSET_X = 12;
// the 5px css bridge before the button must still overlap the point hit circle, otherwise hover drops on the way to the button
const HIT_EDGE_GAP = 3;

export interface RemoveButtonContext {
  map: EngineMap;
  options: RequiredDrawOptions;
  onRemove: (id: StepId) => void;
}

export class RemoveButton {
  private readonly view: RemoveButtonView;
  private readonly offsetX: number;
  private anchor: Step | null = null;
  private rafId = 0;
  private listenersActive = false;

  constructor(private readonly ctx: RemoveButtonContext) {
    this.view = new RemoveButtonView(ctx.map.getContainer(), ctx.options.locale.removePoint);
    this.offsetX = Math.max(MIN_OFFSET_X, ctx.options.interaction.pointHitRadius + HIT_EDGE_GAP);

    const element = this.view.getElement();
    DOM.addEventListener(element, "mouseleave", this.onButtonMouseLeave);
    DOM.addEventListener(element, "click", this.onButtonClick);
  }

  public show = (step: Step) => {
    this.anchor = step;
    this.enableListeners();
    this.updatePosition();
    this.view.show();
  };

  public hide = () => {
    this.cancelFrame();
    this.disableListeners();
    this.anchor = null;
    this.view.hide();
  };

  public destroy = () => {
    this.hide();

    const element = this.view.getElement();
    DOM.removeEventListener(element, "mouseleave", this.onButtonMouseLeave);
    DOM.removeEventListener(element, "click", this.onButtonClick);

    this.view.destroy();
  };

  private cancelFrame = () => {
    if (!this.rafId) return;
    window.cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  };

  private enableListeners = () => {
    if (this.listenersActive) return;
    const { map } = this.ctx;

    map.on("move", this.onMapMove);
    map.on("zoom", this.onMapMove);
    DOM.addEventListener(map.getCanvasContainer(), "pointerdown", this.hide);
    this.listenersActive = true;
  };

  private disableListeners = () => {
    if (!this.listenersActive) return;
    const { map } = this.ctx;

    map.off("move", this.onMapMove);
    map.off("zoom", this.onMapMove);
    DOM.removeEventListener(map.getCanvasContainer(), "pointerdown", this.hide);
    this.listenersActive = false;
  };

  private onMapMove = () => {
    if (this.rafId) return;
    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = 0;
      this.updatePosition();
    });
  };

  private updatePosition = () => {
    if (!this.anchor) return;
    const { map } = this.ctx;

    const point = map.project({ lng: this.anchor.lng, lat: this.anchor.lat });
    const containerWidth = map.getContainer().clientWidth;
    const overflowsRight = point.x + this.offsetX + this.view.getWidth() > containerWidth;

    if (overflowsRight) {
      this.view.setPosition(point.x - this.offsetX, point.y, "left");
    } else {
      this.view.setPosition(point.x + this.offsetX, point.y, "right");
    }
  };

  private onButtonMouseLeave = () => this.hide();

  private onButtonClick = (event: Event) => {
    event.stopPropagation();
    const anchor = this.anchor;

    this.hide();
    if (anchor) this.ctx.onRemove(anchor.id);
  };
}
