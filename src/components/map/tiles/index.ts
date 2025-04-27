import type { GeoJSONSource } from "maplibre-gl";

import type { LatLng, RequiredDrawOptions } from "#types/index";
import type { CustomMap } from "#types/map";
import type { Store } from "#store/index";
import { ELAYERS, ESOURCES, generateLayersToRender } from "#utils/geo_constants";
import { debounce, GeometryFactory, Spatial } from "#utils/helpers";
import type { DrawingMode } from "#components/map/mode";
import type { StoreChangeEvent } from "#store/types";

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

    this.#initConsumers();
  }

  #initConsumers = () => {
    const { store } = this.#props;
    store.addObserver(this.#polygonVisibility);
  };

  #removeConsumers = () => {
    const { store } = this.#props;
    store.removeObserver(this.#polygonVisibility);
  };

  #polygonVisibility = debounce((event: StoreChangeEvent) => {
    if (event.type === "STORE_MUTATED" || event.type === "STORE_DETACHED") {
      const { map, mode, options, store } = this.#props;
      const isPolygon = mode.getMode() === "polygon";
      if (isPolygon && Spatial.isClosedGeometry(store, options)) {
        map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "visible");
      } else {
        map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "none");
      }
    }
  }, 10);

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

  removeTiles = () => {
    // first remove the layers then all the sources
    this.#removeLayers();
    this.#removeSources();
    this.#removeConsumers();
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

  private updatePoint(featureIdx: number, newCoord: LatLng) {
    // points are always the first feature. Check GeometryFactory.getUnifiedFeatures
    const feature = this.#unifiedGeoJSON?.features?.[featureIdx];
    if (feature?.geometry?.coordinates) {
      feature.geometry.coordinates = [newCoord.lng, newCoord.lat];
    }
  }

  renderOnMouseMove = (
    featureIdx: number,
    newCoord: LatLng,
    aux: { next: LatLng | null; prev: LatLng | null } | null,
  ) => {
    const { mode, options, store } = this.#props;
    // if the selected index is the first one then the prev index is the store.size - 1
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

    const unifiedSource = this.#props.map.getSource(ESOURCES.UnifiedSource) as GeoJSONSource;
    if (unifiedSource) {
      unifiedSource.setData(this.#unifiedGeoJSON);
    }
  };

  render() {
    this.#unifiedGeoJSON = GeometryFactory.getUnifiedFeatures(this.#props.store);
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
