import { ESOURCES } from "#app/utils/geo_constants";
import { TilesContext } from ".";

export class Sources {
  constructor(private readonly ctx: Pick<TilesContext, "map">) {}

  init() {
    for (const source of Object.values(ESOURCES)) {
      if (!this.ctx.map.getSource(source)) {
        this.ctx.map.addSource(source, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
          promoteId: "id",
        });
      }
    }
  }

  remove() {
    for (const source of Object.values(ESOURCES)) {
      if (this.ctx.map.getSource(source)) {
        this.ctx.map.removeSource(source);
      }
    }
  }
}
