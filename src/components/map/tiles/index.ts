import type { Store } from "#app/store";
import type { RequiredDrawOptions } from "#app/types";
import type { UnifiedMap } from "#app/types/map";
import { Panel } from "#components/panel";
import { Control } from "#components/side-control";
import { DrawingMode } from "../mode";
import { MouseEvents } from "../mouse-events";
import { Events } from "./events";
import { Layers } from "./layers";
import { Sources } from "./sources";

export type TilesContext = {
  map: UnifiedMap;
  panel: Panel;
  store: Store;
  control: Control;
  options: RequiredDrawOptions;
  mouseEvents: MouseEvents;
  mode: DrawingMode;
};

export class Tiles {
  private sources: Sources;
  private layers: Layers;
  private events: Events | undefined;

  constructor(private readonly ctx: TilesContext) {
    this.sources = new Sources(this.ctx);
    this.layers = new Layers(this.ctx);
    this.events = new Events(this.ctx);
    this.init();
  }

  private init = () => {
    // first add the sources then all the layers
    this.sources.init();
    this.layers.init();
  };

  public remove = () => {
    // first remove the layers then all the sources
    this.layers.remove();
    this.sources.remove();
    this.events?.remove();
  };
}
