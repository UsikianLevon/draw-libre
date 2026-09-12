import { test as base } from "@playwright/test";

import { DrawMapPage } from "./pages/draw-map.page";

export const test = base.extend<{ drawMap: DrawMapPage }>({
  drawMap: async ({ page }, use) => {
    await use(new DrawMapPage(page));
  },
});

export { expect } from "@playwright/test";
