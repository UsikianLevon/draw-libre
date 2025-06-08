import type { GeoJSONSource } from "maplibre-gl";

import type { LatLng, RequiredDrawOptions } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";
import type { Store } from "#app/store/index";
import type { DrawingMode } from "#components/map/mode";
import { ESOURCES } from "#app/utils/geo_constants";
import { GeometryFactory } from "#app/utils/helpers";

interface Context {
  map: UnifiedMap;
  store: Store;
  options: RequiredDrawOptions;
  mode: DrawingMode;
}

export class Renderer {
  private static instance: Renderer | null = null;
  private ctx: Context | null = null;
  private unifiedGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon | GeoJSON.Point>;

  constructor() {
    this.unifiedGeoJSON = {
      type: "FeatureCollection",
      features: [],
    };
  }

  public initialize(ctx: Context): Renderer | null {
    this.ctx = ctx;
    this.unifiedGeoJSON = GeometryFactory.getUnifiedFeatures(this.ctx.store);
    this.execute();

    return Renderer.instance;
  }

  public static getInstance(): Renderer {
    if (!Renderer.instance) {
      Renderer.instance = new Renderer();
    }
    return Renderer.instance;
  }

  private getContext(): Context {
    if (!this.ctx) {
      throw new Error("Somehow trolled with Renderer.getContext, check the Renderer.initialize");
    }
    return this.ctx;
  }

  private updateLine(featureIdx: number, newCoord: LatLng) {
    const { mode } = this.getContext();

    // -2 because line is always the second to last feature. Check GeometryFactory.getUnifiedFeatures
    const line = this.unifiedGeoJSON.features.at(-2)?.geometry.coordinates;
    if (!line) return;
    line[featureIdx] = [newCoord.lng, newCoord.lat];

    if (mode.getClosedGeometry() && featureIdx === 0) {
      line[line.length - 1] = [newCoord.lng, newCoord.lat];
    }
  }

  private updatePolygon(featureIdx: number, newCoord: LatLng) {
    const { mode } = this.getContext();

    // -1 because polygon is always the last feature. Check GeometryFactory.getUnifiedFeatures
    const polygon = this.unifiedGeoJSON.features.at(-1)?.geometry.coordinates[0] as number[][];

    if (!polygon) return;
    polygon[featureIdx] = [newCoord.lng, newCoord.lat];

    if (mode.getClosedGeometry() && featureIdx === 0) {
      polygon[polygon.length - 1] = [newCoord.lng, newCoord.lat];
    }
  }

  private updatePoint(featureIdx: number, newCoord: LatLng) {
    // points are always the first feature. Check GeometryFactory.getUnifiedFeatures
    const feature = this.unifiedGeoJSON?.features?.[featureIdx];
    if (feature?.geometry?.coordinates) {
      feature.geometry.coordinates = [newCoord.lng, newCoord.lat];
    }
  }

  public executeOnMouseMove = (
    featureIdx: number,
    newCoord: LatLng,
    aux: { next: LatLng | null; prev: LatLng | null } | null,
  ) => {
    const { map, mode, options, store } = this.getContext();

    const prevIdx = featureIdx === 0 ? store.size - 1 : featureIdx - 1;

    this.updatePoint(featureIdx, newCoord);
    if (aux && aux.prev) {
      this.updatePoint(prevIdx, aux.prev);
    }
    if (aux && aux.next) {
      this.updatePoint(featureIdx + 1, aux.next);
    }

    this.updateLine(featureIdx, newCoord);
    if (aux && aux.prev) {
      this.updateLine(prevIdx, aux.prev);
    }
    if (aux && aux.next) {
      this.updateLine(featureIdx + 1, aux.next);
    }

    const polygonOptionChecked = options.modes.polygon.visible;

    if (polygonOptionChecked && mode.isPolygon()) {
      this.updatePolygon(featureIdx, newCoord);
      if (aux && aux.prev) {
        this.updatePolygon(prevIdx, aux.prev);
      }
      if (aux && aux.next) {
        this.updatePolygon(featureIdx + 1, aux.next);
      }
    }

    const unifiedSource = map.getSource(ESOURCES.UnifiedSource) as GeoJSONSource;
    if (unifiedSource) {
      unifiedSource.setData(this.unifiedGeoJSON);
    }
  };

  public execute() {
    const { map, store } = this.getContext();

    this.unifiedGeoJSON = GeometryFactory.getUnifiedFeatures(store);
    const unifiedSource = map.getSource(ESOURCES.UnifiedSource) as GeoJSONSource;

    if (unifiedSource) {
      unifiedSource.setData(this.unifiedGeoJSON);
    }
  }

  public resetGeometries = () => {
    const { map } = this.getContext();

    const unifiedSource = map.getSource(ESOURCES.UnifiedSource) as GeoJSONSource;
    if (unifiedSource) {
      unifiedSource.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };
}

export const renderer = Renderer.getInstance();
