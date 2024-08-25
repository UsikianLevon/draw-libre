import type { GeoJSONSource } from "maplibre-gl";

import type { LatLng, RequiredDrawOptions } from "#types/index";
import type { Map } from "#types/map";
import { Store } from "#store/index";
import { ELAYERS, ESOURCES, generateLayersToRender } from "#utils/geo_constants";
import { POINT_BASE, LINE_BASE, POLYGON_BASE } from "#utils/geo_constants";
import { GeometryFactory } from "#utils/helpers";
import { DrawingMode } from "#components/map/mode";

interface IProps {
  map: Map;
  store: Store;
  options: RequiredDrawOptions;
  mode: DrawingMode;
}

export class Tiles {
  #props: IProps;
  #pointsFeature: any;
  #linesFeature: any;
  #polygonFeature: any;

  constructor(props: IProps) {
    this.#props = props;
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
    Object.values(ESOURCES).forEach((source) => {
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
    });
  };

  #addLayers = () => {
    const { map, mode, options } = this.#props;

    const LAYERS_TO_RENDER = generateLayersToRender(options);

    LAYERS_TO_RENDER.forEach((layer) => {
      if (!map.getLayer(layer.id)) {
        map.addLayer(layer);
      }
    });

    const polygonInvisible = map.getLayoutProperty(ELAYERS.PolygonLayer, "visibility") === "none";
    if (mode.getMode() === "polygon" && polygonInvisible) {
      map.setLayoutProperty(ELAYERS.PolygonLayer, "visibility", "visible");
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

    Object.values(ESOURCES).forEach((source) => {
      if (map.getSource(source)) {
        map.removeSource(source);
      }
    });
  };

  #removeLayers = () => {
    const { map } = this.#props;

    Object.values(ELAYERS).forEach((layer) => {
      if (map.getLayer(layer)) {
        map.removeLayer(layer);
      }
    });
  };

  removeTiles = () => {
    // first remove the layers then all the sources
    this.#removeLayers();
    this.#removeSources();
  };

  renderPoints = (points: any) => {
    const { map } = this.#props;

    const pointSource = map.getSource(ESOURCES.PointsSource) as GeoJSONSource;
    if (pointSource) {
      pointSource.setData(points);
    }
  };

  renderLines = (lines: any, source: string) => {
    const { map } = this.#props;

    const lineSource = map.getSource(source) as GeoJSONSource;

    if (lineSource) {
      lineSource.setData(lines);
    }
  };

  renderPolygon = (polygon: any) => {
    const { map } = this.#props;

    const polygoneSource = map.getSource(ESOURCES.PolygonSource) as GeoJSONSource;

    if (polygoneSource) {
      polygoneSource.setData(polygon);
    }
  };

  render = () => {
    const { mode, options, store } = this.#props;

    const points = GeometryFactory.getPoints(store);
    const lines = GeometryFactory.getAllLines(store);
    this.#pointsFeature = points;
    this.#linesFeature = lines;

    this.renderPoints(points);
    this.renderLines(lines, ESOURCES.LineSource);

    const polygonOptionChecked = options.modes.polygon.visible;
    if (polygonOptionChecked && mode.isPolygon()) {
      const polygon = GeometryFactory.getPolygon(store);
      this.#polygonFeature = polygon;
      this.renderPolygon(polygon);
    }
  };

  #renderPolygonOnMouseMove = (featureIdx: number, newCoord: LatLng) => {
    this.#polygonFeature.features[0].geometry.coordinates[0][featureIdx] = [newCoord.lng, newCoord.lat];
    const firstElement = featureIdx === 0;
    if (firstElement) {
      const lastIdx = this.#polygonFeature.features[0].geometry.coordinates[0]?.length - 1;
      this.#polygonFeature.features[0].geometry.coordinates[0][lastIdx] = [newCoord.lng, newCoord.lat];
    }
    this.renderPolygon(this.#polygonFeature);
  };

  #renderLineOnMouseMove = (featureIdx: number, newCoord: LatLng) => {
    const { mode } = this.#props;

    this.#linesFeature.features[0].geometry.coordinates[featureIdx] = [newCoord.lng, newCoord.lat];

    const firstElement = featureIdx === 0;
    const selectedFirstPointInClosedLine = this.#linesFeature && mode.getClosedGeometry() && firstElement;
    if (selectedFirstPointInClosedLine) {
      const lastIdx = this.#linesFeature.features[0].geometry.coordinates?.length - 1;
      this.#linesFeature.features[0].geometry.coordinates[lastIdx] = [newCoord.lng, newCoord.lat];
    }
    this.renderLines(this.#linesFeature, ESOURCES.LineSource);
  };

  renderOnMouseMove = (featureIdx: number, newCoord: LatLng) => {
    const { mode, options } = this.#props;

    this.#pointsFeature.features[featureIdx].geometry.coordinates = [newCoord.lng, newCoord.lat];
    this.renderPoints(this.#pointsFeature);
    this.#renderLineOnMouseMove(featureIdx, newCoord);

    const polygonOptionChecked = options.modes.polygon.visible;
    if (polygonOptionChecked && mode.isPolygon()) {
      this.#renderPolygonOnMouseMove(featureIdx, newCoord);
    }
  };

  resetGeometries = () => {
    this.renderPoints(POINT_BASE);
    this.renderLines(LINE_BASE, ESOURCES.LineSource);
    this.renderPolygon(POLYGON_BASE);
  };
}
