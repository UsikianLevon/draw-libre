import { expect, test } from "./fixtures";
import type { DrawMapPage } from "./pages/draw-map.page";
import type { Pixel } from "./support/layout";
import { ALL_PANEL_BUTTONS } from "./support/options";
import { OPEN_STEPS } from "./support/steps";

async function expectFreshHistory(drawMap: DrawMapPage, at: Pixel) {
  await drawMap.drawing.expectEmpty();
  await drawMap.drawPoint(at);
  await drawMap.panel.expectUndoEnabled();
  await drawMap.undo();
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectUndoDisabled();
}

const FILL: [number, number, number] = [0, 255, 0];

test("adding the control announces the initial drawing mode", async ({ drawMap }) => {
  await drawMap.open();

  await drawMap.events.expectCount("mdl:modechanged", 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line", hasOriginalEvent: false });
});

test("options given by the test reach the control", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: { locale: { removePoint: "Drop this point" } } });

  await drawMap.hoverPoint(line.middle);

  await drawMap.removeButton.expectLabelled("Drop this point");
});

test("a page opened without mounting has no control until asked", async ({ drawMap }) => {
  await drawMap.open({ mount: false });
  await drawMap.modes.line.waitFor({ state: "detached" });

  await drawMap.api.mount({ modes: { initial: "line" } });

  await drawMap.modes.expectLineActive();
  await drawMap.events.expectCount("mdl:modechanged", 1);
});

test("the built package draws a point the same way the sources do", async ({ drawMap }) => {
  await drawMap.open({ bundle: "dist" });
  const point = drawMap.layout.line.first;

  await drawMap.drawPoint(point);

  await drawMap.events.expectCount("mdl:add", 1);
  await drawMap.panel.expectVisible();

  await drawMap.parkPointer();
  await drawMap.hoverPoint(point);
  await drawMap.removeButton.expectRightOf(point);

  await drawMap.parkPointer();
  await drawMap.removeButton.expectHidden();
});

test("adding the control puts the mode buttons in the top-left corner, adds its layers and keeps the panel hidden", async ({
  drawMap,
}) => {
  await drawMap.open({ mount: false });
  await drawMap.modes.line.waitFor({ state: "detached" });
  const before = await drawMap.drawing.mapStyleFootprint();

  await drawMap.api.mount({ modes: { initial: "line" }, panel: { buttons: ALL_PANEL_BUTTONS } });

  await drawMap.modes.expectLineActive();
  await drawMap.modes.expectInTopLeftCorner();
  const after = await drawMap.drawing.mapStyleFootprint();
  expect(after.layers).toEqual(expect.arrayContaining(before.layers));
  expect(after.layers.length).toBeGreaterThan(before.layers.length);
  expect(after.sources.length).toBeGreaterThan(before.sources.length);
  await drawMap.panel.expectHidden();
  await drawMap.removeButton.expectHidden();
});

test("removing the control takes away its buttons, panel, labels and layers, and clicks no longer draw", async ({
  drawMap,
}) => {
  await drawMap.open({ mount: false });
  await drawMap.modes.line.waitFor({ state: "detached" });
  const before = await drawMap.drawing.mapStyleFootprint();
  await drawMap.api.mount({
    modes: { initial: "line" },
    panel: { buttons: ALL_PANEL_BUTTONS },
    locale: { line: "Draw line" },
  });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.panel.expectVisible();
  await drawMap.modes.hover("line");
  await drawMap.tooltip.expectShowing("Draw line");

  await drawMap.api.unmount();

  await drawMap.modes.line.waitFor({ state: "detached" });
  await expect(drawMap.panel.root).toHaveCount(0);
  await expect(drawMap.removeButton.root).toHaveCount(0);
  await drawMap.tooltip.expectNotShowing("Draw line");
  expect(await drawMap.drawing.mapStyleFootprint()).toEqual(before);

  const snapshot = await drawMap.snapshot();
  await drawMap.canvas.click(line.last);
  await drawMap.expectNothingHappenedSince(snapshot);
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("three rounds of adding and removing the same control leave the map style as it was, and a click adds one point", async ({
  drawMap,
}) => {
  await drawMap.open({ mount: false });
  await drawMap.modes.line.waitFor({ state: "detached" });
  const before = await drawMap.drawing.mapStyleFootprint();

  await drawMap.api.mount({ modes: { initial: "line" } });
  await drawMap.modes.expectLineActive();
  await drawMap.api.unmount();
  await drawMap.modes.line.waitFor({ state: "detached" });
  expect(await drawMap.drawing.mapStyleFootprint()).toEqual(before);

  for (let round = 0; round < 2; round += 1) {
    await drawMap.api.remount();
    await drawMap.modes.expectLineActive();
    await drawMap.api.unmount();
    await drawMap.modes.line.waitFor({ state: "detached" });
    expect(await drawMap.drawing.mapStyleFootprint()).toEqual(before);
  }

  await drawMap.api.remount();
  await drawMap.modes.expectLineActive();
  await drawMap.drawPoint(drawMap.layout.line.first);
  await drawMap.events.expectUnchanged("mdl:add", 1);
  await drawMap.drawing.expectPointCount(1);
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("removing the control from a map with a filled polygon leaves nothing drawn", async ({ drawMap }) => {
  await drawMap.open({
    options: {
      modes: { initial: "polygon" },
      layersPaint: { polygon: { "fill-color": `rgb(${FILL.join(", ")})`, "fill-opacity": 1 } },
    },
  });
  const triangle = await drawMap.drawClosedTriangle();
  const inside = drawMap.layout.centroid([triangle.a, triangle.b, triangle.c]);
  await drawMap.drawing.expectPixelNear(inside, FILL);

  await drawMap.api.unmount();

  await drawMap.drawing.expectEmpty();
  await drawMap.drawing.expectPixelNotNear(inside, FILL);
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("the same control added again starts empty with no history, and drawing, dragging, removing and undo work", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.panel.expectUndoEnabled();
  const stackEvents = await drawMap.events.count("mdl:undostackchanged");
  const redoEvents = await drawMap.events.count("mdl:redostackchanged");

  await drawMap.api.unmount();
  await drawMap.events.expectUnchanged("mdl:undostackchanged", stackEvents);
  await drawMap.events.expectUnchanged("mdl:redostackchanged", redoEvents);
  await drawMap.api.remount();

  await drawMap.modes.expectLineActive();
  await drawMap.drawing.expectEmpty();
  await drawMap.drawPoint(line.first);
  await drawMap.undo();
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectUndoDisabled();

  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);
  const dropped = drawMap.layout.offsetFrom(line.middle, 40, 60);
  await drawMap.dragPoint(line.middle, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.parkPointer();
  await drawMap.hoverPoint(dropped);
  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectPointCount(2);
  await drawMap.undo();
  await drawMap.drawing.expectPointCount(3);
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("a disposed control is replaced by a new one that takes new options and has no history", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: { locale: { removePoint: "Old label" } } });

  await drawMap.api.dispose();
  await drawMap.modes.line.waitFor({ state: "detached" });
  await drawMap.api.mount({
    modes: { initial: "line" },
    panel: { buttons: ALL_PANEL_BUTTONS },
    locale: { removePoint: "New label" },
  });

  await drawMap.drawing.expectEmpty();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.first);
  await drawMap.removeButton.expectLabelled("New label");

  await drawMap.undo();
  await drawMap.undo();
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectUndoDisabled();
});

test("removing the control in the same task as the move that ends a drag reports no map errors", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.startDrag(line.middle, drawMap.layout.offsetFrom(line.middle, 40, 60));

  const errors = await drawMap.removeControlRightAfterMovingTo(drawMap.layout.offsetFrom(line.middle, 60, 80));
  await drawMap.canvas.release();

  expect(errors).toEqual([]);
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("a drag released after the control is removed and before it is added again leaves no history", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.startDrag(line.middle, drawMap.layout.offsetFrom(line.middle, 40, 60));

  await drawMap.api.unmount();
  await drawMap.canvas.release();
  await drawMap.api.remount();

  await expectFreshHistory(drawMap, line.first);
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("a drag release that comes after the same control is added again leaves no history", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.startDrag(line.middle, drawMap.layout.offsetFrom(line.middle, 40, 60));
  await drawMap.api.unmount();
  await drawMap.api.remount();

  await drawMap.canvas.release();

  await drawMap.canvas.settle();
  await drawMap.panel.expectUndoDisabled();
  await expectFreshHistory(drawMap, line.first);
  await drawMap.events.expectNever("mdl:moveend");
});

test("in auto mode a midpoint drag released before the same control is added again leaves no history", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);
  await drawMap.drawing.expectAuxiliaryCount(1);
  await drawMap.startDrag(pair.midpoint, drawMap.layout.offsetFrom(pair.midpoint, 0, 60));

  await drawMap.api.unmount();
  await drawMap.canvas.release();
  await drawMap.api.remount();

  await expectFreshHistory(drawMap, pair.left);
});

test("in auto mode a midpoint drag released after the same control is added again leaves no history", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);
  await drawMap.drawing.expectAuxiliaryCount(1);
  await drawMap.startDrag(pair.midpoint, drawMap.layout.offsetFrom(pair.midpoint, 0, 60));

  await drawMap.api.unmount();
  await drawMap.api.remount();
  await drawMap.canvas.release();

  await drawMap.canvas.settle();
  await drawMap.panel.expectUndoDisabled();
  await expectFreshHistory(drawMap, pair.left);
});

test("a control replaced right after the pointer leaves a point keeps the new control's cursor", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);
  await drawMap.canvas.hoverThrough(line.middle);
  await drawMap.drawing.expectCursor("grab");

  const leaves = await drawMap.events.count("mdl:pointleave");
  const errors = await drawMap.replaceControlRightAfterMovingTo(drawMap.layout.emptySpot, {
    modes: { initial: null },
  });

  expect(errors).toEqual([]);
  await drawMap.events.expectCount("mdl:pointleave", leaves + 1);
  await drawMap.modes.expectNoneActive();
  await drawMap.canvas.settle();
  await drawMap.drawing.expectCursor("auto");
});

test("removing the control in the same task as setSteps reports no map errors", async ({ drawMap }) => {
  await drawMap.open();

  const errors = await drawMap.api.removeControlRightAfterSetSteps(OPEN_STEPS);

  expect(errors).toEqual([]);
  await drawMap.modes.line.waitFor({ state: "detached" });
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("removing the control in the same task as adding it reports no map errors", async ({ drawMap }) => {
  await drawMap.open({ mount: false });
  await drawMap.modes.line.waitFor({ state: "detached" });

  const errors = await drawMap.api.removeControlRightAfterMount({ modes: { initial: "line" } });

  expect(errors).toEqual([]);
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);
});

test("a control replaced right after the pointer enters the first point of a closable line keeps the new control's cursor", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();
  const enters = await drawMap.events.count("mdl:pointenter");

  const errors = await drawMap.replaceControlRightAfterMovingTo(line.first, { modes: { initial: null } });

  expect(errors).toEqual([]);
  await drawMap.events.expectCount("mdl:pointenter", enters + 1);
  await drawMap.modes.expectNoneActive();
  await drawMap.canvas.settle();
  await drawMap.drawing.expectCursor("auto");
});
