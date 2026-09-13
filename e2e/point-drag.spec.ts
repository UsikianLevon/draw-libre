import { test, expect } from "./fixtures";

test("dragging a generated midpoint is one undo step", async ({ drawMap }) => {
  await drawMap.open({ pointGeneration: "auto" });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);
  await expect.poll(() => drawMap.vertexCount()).toBe(3);

  await drawMap.dragPoint(pair.midpoint, drawMap.layout.offsetFrom(pair.midpoint, 0, 60));
  await drawMap.events.expectCount("mdl:moveend", 1);
  await expect.poll(() => drawMap.vertexCount()).toBe(5);

  await drawMap.panel.clickUndo();
  await expect.poll(() => drawMap.vertexCount()).toBe(3);
  await expect.poll(() => drawMap.vertexCountBy("auxiliary")).toBe(1);

  await drawMap.panel.clickUndo();
  await expect.poll(() => drawMap.vertexCount()).toBe(1);
});

test("pressing a generated midpoint without moving it is one undo step too", async ({ drawMap }) => {
  await drawMap.open({ pointGeneration: "auto" });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);
  await expect.poll(() => drawMap.vertexCount()).toBe(3);

  await drawMap.canvas.press(pair.midpoint);
  await drawMap.canvas.release();
  await expect.poll(() => drawMap.vertexCount()).toBe(5);

  await drawMap.panel.clickUndo();
  await expect.poll(() => drawMap.vertexCount()).toBe(3);
  await expect.poll(() => drawMap.vertexCountBy("primary")).toBe(2);
  await expect.poll(() => drawMap.vertexCountBy("auxiliary")).toBe(1);
});

test("a drag hides the grab areas and the transparent line and brings them back on release", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);

  await drawMap.canvas.press(line.middle);
  await drawMap.canvas.dragTo(dropped);
  await expect.poll(() => drawMap.layerVisibility("mdl-points-hit-layer")).toBe("none");
  await expect.poll(() => drawMap.layerVisibility("mdl-auxiliary-point-hit-layer")).toBe("none");
  await expect.poll(() => drawMap.layerVisibility("mdl-line-layer-transparent")).toBe("none");

  await drawMap.canvas.release();
  await expect.poll(() => drawMap.layerVisibility("mdl-points-hit-layer")).toBe("visible");
  await expect.poll(() => drawMap.layerVisibility("mdl-auxiliary-point-hit-layer")).toBe("visible");
  await expect.poll(() => drawMap.layerVisibility("mdl-line-layer-transparent")).toBe("visible");
  await drawMap.events.expectCount("mdl:moveend", 1);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(dropped);
  await expect.poll(() => drawMap.hoveredPointIds()).toHaveLength(1);
});

test("a click on the first point closes the line without touching the grab areas", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.recordVisibilityChanges();

  await drawMap.canvas.click(line.first);

  await expect.poll(() => drawMap.lineIsClosed()).toBe(true);
  expect(await drawMap.dragLayerChanges()).toEqual([]);
});

test("a nudge shorter than the click tolerance still counts as a click on the first point", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.recordVisibilityChanges();

  await drawMap.canvas.press(line.first);
  await drawMap.canvas.dragTo(drawMap.layout.offsetFrom(line.first, 2, 0));
  await drawMap.canvas.release();

  await expect.poll(() => drawMap.lineIsClosed()).toBe(true);
  expect(await drawMap.dragLayerChanges()).toEqual([]);
});

test("a short out and back drag never adds a point on release", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const away = drawMap.layout.offsetFrom(line.middle, 12, 0);
  const back = drawMap.layout.offsetFrom(line.middle, 1, 0);

  await drawMap.canvas.press(line.middle);
  await drawMap.canvas.dragTo(away);
  await expect.poll(() => drawMap.layerVisibility("mdl-points-hit-layer")).toBe("none");
  await drawMap.canvas.dragTo(back);
  await drawMap.canvas.release();

  await drawMap.events.expectCount("mdl:moveend", 1);
  await expect.poll(() => drawMap.vertexCount()).toBe(3);
  await drawMap.events.expectCount("mdl:add", 3);
});

test("a drag reports one pointenter for the grabbed point, not two", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);
  await drawMap.parkPointer();

  const entersBefore = await drawMap.events.count("mdl:pointenter");
  await drawMap.hoverPoint(line.middle);
  await drawMap.events.expectCount("mdl:pointenter", entersBefore + 1);

  const idles = await drawMap.canvas.idleCount();
  await drawMap.dragPoint(line.middle, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.canvas.waitUntilRepainted(idles);
  await drawMap.canvas.hover(drawMap.layout.offsetFrom(dropped, 2, 0));
  await drawMap.canvas.hover(drawMap.layout.offsetFrom(dropped, -2, 0));

  await drawMap.events.expectCount("mdl:pointenter", entersBefore + 1);

  const leavesBefore = await drawMap.events.count("mdl:pointleave");
  await drawMap.parkPointer();
  await drawMap.events.expectCount("mdl:pointleave", leavesBefore + 1);

  await drawMap.hoverPoint(dropped);
  await drawMap.events.expectCount("mdl:pointenter", entersBefore + 2);
});
