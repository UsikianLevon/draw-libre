import { expect, type Page } from "@playwright/test";

import type { Pixel } from "../support/layout";

const LAYER = "mdl-line-dynamic-layer";
const TOLERANCE_PX = 3;

export class DynamicLine {
  constructor(private readonly page: Page) {}

  async freeEnd(): Promise<Pixel | null> {
    return this.page.evaluate((layer) => {
      const painted = window.map.queryRenderedFeatures({ layers: [layer] });
      const feature = painted[0];
      if (!feature) return null;

      const coordinates = (feature.geometry as GeoJSON.LineString).coordinates;
      const last = coordinates[coordinates.length - 1];
      if (!last) return null;

      const box = window.map.getContainer().getBoundingClientRect();
      const point = window.map.project({ lng: last[0] as number, lat: last[1] as number });

      return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
    }, LAYER);
  }

  async expectFreeEndAt(cursor: Pixel) {
    await expect
      .poll(async () => {
        const end = await this.freeEnd();
        return end ? Math.round(Math.hypot(end.x - cursor.x, end.y - cursor.y)) : Number.POSITIVE_INFINITY;
      })
      .toBeLessThanOrEqual(TOLERANCE_PX);
  }
}
