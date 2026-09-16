import { expect, test } from "./fixtures";
import type { DrawMapPage } from "./pages/draw-map.page";
import type { Pixel } from "./support/layout";

async function expectFreshHistoryByTap(drawMap: DrawMapPage, at: Pixel) {
  await drawMap.drawing.expectEmpty();
  await drawMap.drawPointByTap(at);
  await drawMap.panel.expectUndoEnabled();
  await drawMap.tapUndo();
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectUndoDisabled();
}

test("a finger drag released after the control is removed and before it is added again leaves no history", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLineByTap();
  await drawMap.startDragByTouch(line.middle, drawMap.layout.offsetFrom(line.middle, 40, 60));

  await drawMap.api.unmount();
  await drawMap.canvas.releaseTouch();
  await drawMap.api.remount();

  await expectFreshHistoryByTap(drawMap, line.first);
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("a finger drag released after the same control is added again leaves no history", async ({ drawMap }) => {
  const line = await drawMap.openWithLineByTap();
  await drawMap.startDragByTouch(line.middle, drawMap.layout.offsetFrom(line.middle, 40, 60));
  await drawMap.api.unmount();
  await drawMap.api.remount();

  await drawMap.canvas.releaseTouch();

  await drawMap.canvas.settle();
  await drawMap.panel.expectUndoDisabled();
  await expectFreshHistoryByTap(drawMap, line.first);
  await drawMap.events.expectNever("mdl:moveend");
});
