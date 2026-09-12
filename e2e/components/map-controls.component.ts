import { type Locator, type Page } from "@playwright/test";

export class MapControls {
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;

  constructor(page: Page) {
    this.zoomInButton = page.locator(".maplibregl-ctrl-zoom-in");
    this.zoomOutButton = page.locator(".maplibregl-ctrl-zoom-out");
  }

  async zoomIn() {
    await this.zoomInButton.click();
  }

  async zoomOut() {
    await this.zoomOutButton.click();
  }
}
