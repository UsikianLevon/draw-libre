import { test } from "./fixtures";

test("drawing on a touch screen shows no dynamic line, also after the pointer moves over the map", async ({
  drawMap,
}) => {
  await drawMap.openWithLineByTap();
  await drawMap.drawing.expectDynamicLineHidden();

  await drawMap.sweepPointer();

  await drawMap.drawing.expectDynamicLineHidden();
});
