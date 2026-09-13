import { expect, type Page } from "@playwright/test";

import type { Pixel } from "../support/layout";

const LAYER = "mdl-single-point-layer";

export class GhostPoint {
  constructor(private readonly page: Page) {}

  async position(): Promise<Pixel | null> {
    return this.page.evaluate((layer) => {
      const painted = window.map.queryRenderedFeatures({ layers: [layer] });
      const feature = painted[0];
      if (!feature) return null;

      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      const box = window.map.getContainer().getBoundingClientRect();
      const point = window.map.project({ lng, lat });

      return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
    }, LAYER);
  }

  async expectAtProjectionOf(cursor: Pixel, from: Pixel, to: Pixel, tolerancePx = 1) {
    const abx = to.x - from.x;
    const aby = to.y - from.y;
    const lengthSquared = abx * abx + aby * aby;
    const t = Math.min(1, Math.max(0, ((cursor.x - from.x) * abx + (cursor.y - from.y) * aby) / lengthSquared));
    const expected = { x: from.x + abx * t, y: from.y + aby * t };

    await expect
      .poll(async () => {
        const at = await this.position();
        return at ? Math.round(Math.hypot(at.x - expected.x, at.y - expected.y)) : Number.POSITIVE_INFINITY;
      })
      .toBeLessThanOrEqual(tolerancePx);
  }

  async expectRenderedAt(at: Pixel, radiusPx = 3) {
    await expect
      .poll(() =>
        this.page.evaluate(
          ({ target, radius, layer }) => {
            const box = window.map.getContainer().getBoundingClientRect();
            const x = target.x - box.left;
            const y = target.y - box.top;
            return window.map.queryRenderedFeatures(
              [
                [x - radius, y - radius],
                [x + radius, y + radius],
              ],
              { layers: [layer] },
            ).length;
          },
          { target: at, radius: radiusPx, layer: LAYER },
        ),
      )
      .toBeGreaterThan(0);
  }

  async expectVisible() {
    await expect.poll(() => this.position()).not.toBeNull();
  }

  async expectStillVisible() {
    await expect.poll(() => this.position()).not.toBeNull();
    await this.page.waitForTimeout(120);
    expect(await this.position()).not.toBeNull();
  }

  async expectHidden() {
    await expect.poll(() => this.position()).toBeNull();
    await this.page.waitForTimeout(80);
    expect(await this.position()).toBeNull();
  }
}
