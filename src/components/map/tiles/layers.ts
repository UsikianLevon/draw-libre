import type { StoreChangeEvent, StoreChangeEventKeys } from "#app/store/types";
import { ELAYERS, generateLayersToRender } from "#app/utils/geo_constants";
import { debounce, Spatial } from "#app/utils/helpers";
import type { Context } from ".";

export class Layers {
  constructor(private readonly ctx: Context) { }

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
    console.log(event);

    const events = [
      "STORE_MUTATED",
      "STORE_LAST_POINT_REMOVED",
      "STORE_CLOSE_GEOMETRY",
      "STORE_BREAK_GEOMETRY",
    ] as string[];
    if (events.includes(event.type)) {
      const { map, options, store } = this.ctx;

      if (store.size && Spatial.isClosedGeometry(store, options)) {
        map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "visible");
      } else {
        map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "none");
      }
    }
  }, 10);

  private add = () => {
    const LAYERS_TO_RENDER = generateLayersToRender(this.ctx.options);

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
