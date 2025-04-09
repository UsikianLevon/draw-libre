import type { GeoJSONSource } from "maplibre-gl";

import type { LatLng, RequiredDrawOptions } from "#types/index";
import type { CustomMap } from "#types/map";
import type { Store } from "#store/index";
import { ELAYERS, ESOURCES, generateLayersToRender } from "#utils/geo_constants";
import { GeometryFactory } from "#utils/helpers";
import type { DrawingMode } from "#components/map/mode";

interface IProps {
  map: CustomMap;
  store: Store;
  options: RequiredDrawOptions;
  mode: DrawingMode;
}

export class Tiles {
  #props: IProps;
  #unifiedGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon | GeoJSON.Point>;

  constructor(props: IProps) {
    this.#props = props;
    this.#unifiedGeoJSON = GeometryFactory.getUnifiedFeatures(this.#props.store);

    this.#init();
    this.render();
  }

  #init() {
    this.#addSources();
    this.#addLayers();
    this.#swapLayers(ELAYERS.LineLayer, ELAYERS.SinglePointLayer);
    this.#swapLayers(ELAYERS.LineLayerTransparent, ELAYERS.SinglePointLayer);
    this.#swapLayers(ELAYERS.LineLayerTransparent, ELAYERS.FirstPointLayer);
    this.#swapLayers(ELAYERS.LineLayerTransparent, ELAYERS.PointsLayer);
    this.#swapLayers(ELAYERS.PolygonLayer, ELAYERS.LineLayer);
  }

  #addSources = () => {
    const { map } = this.#props;
    for (const source of Object.values(ESOURCES)) {
      if (!map.getSource(source)) {
        map.addSource(source, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
          promoteId: "id",
        });
      }
    }
  };

  #addLayers = () => {
    const { map, options } = this.#props;

    const LAYERS_TO_RENDER = generateLayersToRender(options);

    for (const layer of LAYERS_TO_RENDER) {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
      }
    }
  };

  #swapLayers = (beneathLayerId: string, aboveLayerId: string) => {
    const { map } = this.#props;

    const beneath = map.getLayer(beneathLayerId);
    const above = map.getLayer(aboveLayerId);

    if (beneath && above) {
      map.moveLayer(beneathLayerId, aboveLayerId);
    }
  };

  #removeSources = () => {
    const { map } = this.#props;

    for (const source of Object.values(ESOURCES)) {
      if (map.getSource(source)) {
        map.removeSource(source);
      }
    }
  };

  #removeLayers = () => {
    const { map } = this.#props;

    for (const layer of Object.values(ELAYERS)) {
      if (map.getLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  };

  private updateLine(featureIdx: number, newCoord: LatLng) {
    const { mode } = this.#props;

    // -2 because line is always the second to last feature. Check GeometryFactory.getUnifiedFeatures
    const line = this.#unifiedGeoJSON.features.at(-2)?.geometry.coordinates;
    if (!line) return;
    line[featureIdx] = [newCoord.lng, newCoord.lat];

    if (mode.getClosedGeometry() && featureIdx === 0) {
      line[line.length - 1] = [newCoord.lng, newCoord.lat];
    }
  }

  private updatePolygon(featureIdx: number, newCoord: LatLng) {
    const { mode } = this.#props;

    // -1 because line is always the last feature. Check GeometryFactory.getUnifiedFeatures
    const polygon = this.#unifiedGeoJSON.features.at(-1)?.geometry.coordinates[0] as number[][];
    if (!polygon) return;
    polygon[featureIdx] = [newCoord.lng, newCoord.lat];

    if (mode.getClosedGeometry() && featureIdx === 0) {
      polygon[polygon.length - 1] = [newCoord.lng, newCoord.lat];
    }
  }

  removeTiles = () => {
    // first remove the layers then all the sources
    this.#removeLayers();
    this.#removeSources();
  };

  render() {
    this.#unifiedGeoJSON = GeometryFactory.getUnifiedFeatures(this.#props.store)
    const unifiedSource = this.#props.map.getSource(ESOURCES.UnifiedSource) as GeoJSONSource;

    if (unifiedSource) {
      unifiedSource.setData(this.#unifiedGeoJSON);
    }
  }


  renderOnMouseMove = (featureIdx: number, newCoord: LatLng) => {
    const { mode, options, map } = this.#props;

    // points are always the first feature. Check GeometryFactory.getUnifiedFeatures
    const feature = this.#unifiedGeoJSON?.features?.[featureIdx];
    if (feature?.geometry?.coordinates) {
      feature.geometry.coordinates = [newCoord.lng, newCoord.lat];
    }

    this.updateLine(featureIdx, newCoord);

    const polygonOptionChecked = options.modes.polygon.visible;

    if (polygonOptionChecked && mode.isPolygon()) {
      this.updatePolygon(featureIdx, newCoord);
    }

    const unifiedSource = this.#props.map.getSource(ESOURCES.UnifiedSource) as GeoJSONSource;
    if (unifiedSource) {
      unifiedSource.setData(this.#unifiedGeoJSON);
    }
  }

  resetGeometries = () => {
    const unifiedSource = this.#props.map.getSource(ESOURCES.UnifiedSource) as GeoJSONSource;
    if (unifiedSource) {
      unifiedSource.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };
}
