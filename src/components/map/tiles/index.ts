import type { Store } from "#app/store";
import type { RequiredDrawOptions } from "#app/types";
import type { UnifiedMap } from "#app/types/map";
import { DrawingMode } from "../mode";
import { Layers } from "./layers";
import { Sources } from "./sources";

export interface Context {
  map: UnifiedMap;
  store: Store;
  options: RequiredDrawOptions;
  mode: DrawingMode;
}

export class Tiles {
  private sources: Sources;
  private layers: Layers;

  constructor(private readonly ctx: Context) {
    this.sources = new Sources(this.ctx);
    this.layers = new Layers(this.ctx);
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
  };
}
