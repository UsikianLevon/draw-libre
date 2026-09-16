import type { Point } from "#app/types/index";
import type { EngineMap } from "#app/types/engine";
import { ELAYERS } from "#app/utils/geo_constants";

// maplibre still fires a click when release lands within 3px of press, a wobble that small should not cost two tile reparses
const CLICK_TOLERANCE_PX = 3;

const LAYERS = [
  ELAYERS.LineLayerTransparent,
  ELAYERS.PointsHitLayer,
  ELAYERS.FirstPointHitLayer,
  ELAYERS.AuxiliaryPointHitLayer,
];

type Visibility = "visible" | "none";

export class DragLayers {
  private pressPoint: Point | null = null;
  private saved: Map<string, Visibility> | null = null;

  constructor(private readonly map: EngineMap) {}

  press = (point: Point) => {
    this.pressPoint = { x: point.x, y: point.y };
  };

  move = (point: Point) => {
    if (!this.pressPoint || this.saved) return;
    if (Math.hypot(point.x - this.pressPoint.x, point.y - this.pressPoint.y) <= CLICK_TOLERANCE_PX) return;

    this.hide();
  };

  release = () => {
    this.pressPoint = null;
    if (!this.saved) return;

    for (const [id, visibility] of this.saved) {
      if (this.map.getLayer(id)) {
        this.map.setLayoutProperty(id, "visibility", visibility);
      }
    }
    this.saved = null;
  };

  private hide() {
    this.saved = new Map();

    for (const id of LAYERS) {
      if (!this.map.getLayer(id)) continue;

      const current = (this.map.getLayoutProperty(id, "visibility") as Visibility | undefined) ?? "visible";
      this.saved.set(id, current);
      this.map.setLayoutProperty(id, "visibility", "none");
    }
  }
}
