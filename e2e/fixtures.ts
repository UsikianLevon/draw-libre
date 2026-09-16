import { test as base } from "@playwright/test";

import { DrawMapPage } from "./pages/draw-map.page";

export const test = base.extend<{ drawMap: DrawMapPage }>({
  drawMap: async ({ page }, use) => {
    const drawMap = new DrawMapPage(page);
    await use(drawMap);
    await drawMap.events.expectChannelsMatch();
  },
});

export { expect } from "@playwright/test";
