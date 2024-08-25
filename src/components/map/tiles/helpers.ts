import type { Map } from "#types/map";

import { ELAYERS, FIRST_POINT_COLOR, generateLayersToRender, FIRST_POINT_RADIUS } from "#utils/geo_constants";
import { RequiredDrawOptions } from "#types/index";

export class TilesHelpers {
  static #lastClickTime = 0;

  static #firstPointCircleRadius = (map: Map) => {
    map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-radius", FIRST_POINT_RADIUS["large"]);
    map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-stroke-color", FIRST_POINT_COLOR["large"]);
  };

  static #defaultPointCircleRadius = (map: Map) => {
    map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-radius", FIRST_POINT_RADIUS["default"]);
    map.setPaintProperty(ELAYERS.FirstPointLayer, "circle-stroke-color", FIRST_POINT_COLOR["default"]);
  };

  static togglePointCircleRadius = (map: Map, type: keyof typeof FIRST_POINT_RADIUS) => {
    if (type === "large") {
      this.#firstPointCircleRadius(map);
    } else {
      this.#defaultPointCircleRadius(map);
    }
  };

  static removeTransparentLine = (map: Map) => {
    map.removeLayer(ELAYERS.LineLayerTransparent);
  };

  static addTransparentLine = (map: Map, options: RequiredDrawOptions) => {
    if (map.getLayer(ELAYERS.LineLayerTransparent)) return;
    const LAYERS_TO_RENDER = generateLayersToRender(options);
    const transparentLayer = LAYERS_TO_RENDER.find((layer) => layer.id === ELAYERS.LineLayerTransparent);
    if (transparentLayer) {
      map.addLayer(transparentLayer);
    }
  };

  static isDoubleClick() {
    const DOUBLE_CLICK_THRESHOLD = 400;
    const now = Date.now();

    if (now - this.#lastClickTime <= DOUBLE_CLICK_THRESHOLD) {
      this.#lastClickTime = now;
      return true;
    }

    this.#lastClickTime = now;
    return false;
  }
}
