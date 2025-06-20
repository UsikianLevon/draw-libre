import type { StoreChangeEvent, StoreChangeEventKeys } from "#app/store/types";
import { ELAYERS, generateLayers } from "#app/utils/geo_constants";
import { debounce } from "#app/utils/helpers";
import { TilesContext } from ".";

export class Layers {
  constructor(private readonly ctx: TilesContext) {}

  public init() {
    this.add();
    this.swap(ELAYERS.LineLayer, ELAYERS.SinglePointLayer);
    this.swap(ELAYERS.LineLayerTransparent, ELAYERS.SinglePointLayer);
    this.swap(ELAYERS.LineLayerTransparent, ELAYERS.FirstPointLayer);
    this.swap(ELAYERS.LineLayerTransparent, ELAYERS.PointsLayer);
    this.swap(ELAYERS.PolygonLayer, ELAYERS.LineLayer);

    this.initConsumers();
  }

  private initConsumers = () => {
    this.ctx.store.addObserver(this.onStoreChange);
  };

  private removeConsumers = () => {
    this.ctx.store.removeObserver(this.onStoreChange);
  };

  private onStoreChange = debounce((event: StoreChangeEvent) => {
    const events = [
      "STORE_MUTATED",
      "STORE_CLOSE_GEOMETRY",
      "STORE_BREAK_GEOMETRY",
      "STORE_CLEARED",
    ] as StoreChangeEventKeys[];

    if (events.includes(event.type)) {
      const { map, store, mode } = this.ctx;

      const isPolygonMode = mode.getMode() === "polygon";

      if (isPolygonMode && store.circular.isCircular()) {
        map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "visible");
      } else {
        map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "none");
      }
    }
  }, 10);

  private add = () => {
    const LAYERS_TO_RENDER = generateLayers(this.ctx.options);

    for (const layer of LAYERS_TO_RENDER) {
      if (!this.ctx.map.getLayer(layer.id)) {
        this.ctx.map.addLayer(layer);
      }
    }
  };

  private swap = (beneathLayerId: string, aboveLayerId: string) => {
    const beneath = this.ctx.map.getLayer(beneathLayerId);
    const above = this.ctx.map.getLayer(aboveLayerId);

    if (beneath && above) {
      this.ctx.map.moveLayer(beneathLayerId, aboveLayerId);
    }
  };

  private removeLayers = () => {
    for (const layer of Object.values(ELAYERS)) {
      if (this.ctx.map.getLayer(layer)) {
        this.ctx.map.removeLayer(layer);
      }
    }
  };

  public remove = () => {
    this.removeConsumers();
    this.removeLayers();
  };
}
