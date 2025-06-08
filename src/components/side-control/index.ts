import type { RequiredDrawOptions } from "#app/types/index";
import { UnifiedMap } from "#app/types/map";
import { DrawingMode } from "#components/map/mode";
import { Events } from "./events";
import { Observer } from "./observer";
import { View } from "./view";
import "./control.css";

export interface Context {
  options: RequiredDrawOptions;
  mode: DrawingMode;
  map: UnifiedMap;
}

export class Control {
  private readonly view: View;
  private readonly events: Events;
  private readonly observer: Observer;

  constructor(readonly ctx: Context) {
    this.view = new View(ctx);
    const enrichedCtx: Context & { view: View } = { ...ctx, view: this.view };

    this.events = new Events(enrichedCtx);
    this.observer = new Observer(enrichedCtx);
    this.init();
  }

  init() {
    const root = this.view.getContainer();
    this.ctx.map.getContainer().appendChild(root);
  }

  public getContainer(): HTMLDivElement {
    return this.view.getContainer();
  }

  public destroy() {
    this.events.remove();
    this.observer.removeConsumers();
    this.view.destroy();
  }
}
