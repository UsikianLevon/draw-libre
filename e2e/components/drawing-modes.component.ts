import { expect, type Locator, type Page } from "@playwright/test";

export class DrawingModes {
  readonly line: Locator;
  readonly polygon: Locator;
  readonly break: Locator;

  constructor(page: Page) {
    const root = page.locator(".maplibregl-ctrl-group");
    this.line = root.locator('button[data-type="line"]');
    this.polygon = root.locator('button[data-type="polygon"]');
    this.break = root.locator('button[data-type="break"]');
  }

  async chooseLine() {
    await this.line.click();
  }

  async choosePolygon() {
    await this.polygon.click();
  }

  async expectPolygonActive() {
    await expect(this.polygon).toHaveClass(/control-button-active/);
  }
}
