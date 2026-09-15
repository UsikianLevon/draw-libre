import { test, expect } from "./fixtures";

test("dragging a generated midpoint is one undo step", async ({ drawMap }) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);
  await drawMap.drawing.expectPointCount(3);

  const dropped = drawMap.layout.offsetFrom(pair.midpoint, 0, 60);
  await drawMap.dragPoint(pair.midpoint, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.drawing.expectPointCount(5);
  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(2);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
  const grabbed = (await drawMap.drawing.points()).find(
    (point) => Math.hypot(point.px.x - dropped.x, point.px.y - dropped.y) <= 2,
  );
  expect(grabbed?.auxiliary).toBe(false);

  await drawMap.panel.clickUndo();
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectAuxiliaryCount(1);

  await drawMap.panel.clickUndo();
  await drawMap.drawing.expectPointCount(1);
});

test("pressing a generated midpoint without moving it is one undo step too", async ({ drawMap }) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);
  await drawMap.drawing.expectPointCount(3);

  await drawMap.canvas.press(pair.midpoint);
  await drawMap.canvas.release();
  await drawMap.drawing.expectPointCount(5);

  await drawMap.panel.clickUndo();
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectPrimaryCount(2);
  await drawMap.drawing.expectAuxiliaryCount(1);
});

test("while a point is being dragged, the other points do not react to the pointer", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: { locale: { closeLine: "Close this line" } } });
  const middleId = await drawMap.events.idOf("mdl:add", 1);
  const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);
  await drawMap.parkPointer();

  const entersBefore = await drawMap.events.count("mdl:pointenter");
  await drawMap.hoverPoint(line.middle);
  await drawMap.events.expectCount("mdl:pointenter", entersBefore + 1);
  await drawMap.canvas.press(line.middle);
  await drawMap.canvas.dragTo(line.first);
  await drawMap.events.expectUnchanged("mdl:pointenter", entersBefore + 1);
  expect(await drawMap.drawing.hoveredPointIds()).toEqual([middleId]);
  await drawMap.tooltip.expectNotShowing("Close this line");
  await drawMap.removeButton.expectHidden();

  await drawMap.canvas.dragTo(dropped);
  await drawMap.canvas.release();
  await drawMap.events.expectCount("mdl:moveend", 1);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.first);
  await drawMap.events.expectCount("mdl:pointenter", entersBefore + 2);
});

test("a short out and back drag never adds a point on release", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const away = drawMap.layout.offsetFrom(line.middle, 12, 0);
  const back = drawMap.layout.offsetFrom(line.middle, 1, 0);

  await drawMap.canvas.press(line.middle);
  await drawMap.canvas.dragTo(away);
  await expect.poll(() => drawMap.drawing.pointNear(away, 3)).not.toBeNull();
  await drawMap.canvas.dragTo(back);
  await drawMap.canvas.release();

  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.drawing.expectPointCount(3);
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

  await drawMap.events.expectUnchanged("mdl:pointenter", entersBefore + 1);

  const leavesBefore = await drawMap.events.count("mdl:pointleave");
  await drawMap.parkPointer();
  await drawMap.events.expectCount("mdl:pointleave", leavesBefore + 1);

  await drawMap.hoverPoint(dropped);
  await drawMap.events.expectCount("mdl:pointenter", entersBefore + 2);
});

test("dropping a point reports where it started and where it landed", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const middle = (await drawMap.drawing.steps())[1]!;
  const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);

  await drawMap.dragPoint(line.middle, dropped);

  await drawMap.events.expectCount("mdl:moveend", 1);
  const moved = await drawMap.events.payloadOf("mdl:moveend", 0);
  expect(moved).toMatchObject({
    id: middle.id,
    total: 3,
    start_coordinates: { lat: middle.lat, lng: middle.lng },
  });
  const landed = await drawMap.drawing.pixelOf(moved.end_coordinates as { lat: number; lng: number });
  expect(Math.hypot(landed.x - dropped.x, landed.y - dropped.y)).toBeLessThanOrEqual(1);
});

test("after a drop the line runs through the new place and nothing is left at the old one", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);

  await drawMap.dragPoint(line.middle, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);

  await drawMap.drawing.expectSegmentPainted(line.first, dropped);
  await drawMap.drawing.expectSegmentPainted(dropped, line.last);
  await drawMap.drawing.expectSegmentNotPainted(line.first, line.middle);
  await drawMap.drawing.expectNoPointNear(line.middle, 3);
});

test("dragging the first point of a closed line moves both of its ends", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.closeByClickingFirst(line.first);
  const dropped = drawMap.layout.offsetFrom(line.first, -60, 80);

  await drawMap.dragPoint(line.first, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);

  await drawMap.drawing.expectClosed();
  expect(await drawMap.drawing.steps()).toHaveLength(3);
  await drawMap.drawing.expectSegmentPainted(dropped, line.middle);
  await drawMap.drawing.expectSegmentPainted(line.last, dropped);
});

test("in auto mode a dragged point pulls its neighbouring midpoints to the new segments", async ({ drawMap }) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);

  const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);
  await drawMap.dragPoint(line.middle, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);

  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(2);
  await drawMap.drawing.expectPointNear(dropped);
  await drawMap.drawing.expectNoPointNear(line.middle, 3);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
});

test("undo puts a dragged point back and redo moves it again", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const before = await drawMap.drawing.stepCoordinates();
  const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);
  await drawMap.dragPoint(line.middle, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  const after = await drawMap.drawing.stepCoordinates();
  const original = [line.first, line.middle, line.last];
  const dragged = [line.first, dropped, line.last];

  await drawMap.undo();

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(before);
  await drawMap.drawing.expectPointNear(line.middle);
  await drawMap.drawing.expectLineAlong(original);
  await drawMap.drawing.expectLineGoneFrom(dragged, original);

  await drawMap.redo();

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(after);
  await drawMap.drawing.expectPointNear(dropped);
  await drawMap.drawing.expectLineAlong(dragged);
  await drawMap.drawing.expectLineGoneFrom(original, dragged);
});

test("with the drawing mode switched off a point cannot be dragged", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const before = await drawMap.drawing.stepCoordinates();
  await drawMap.modes.chooseLine();
  await drawMap.modes.expectNoneActive();

  await drawMap.dragPoint(line.middle, drawMap.layout.offsetFrom(line.middle, 90, 70));

  await drawMap.events.expectNever("mdl:moveend");
  expect(await drawMap.drawing.stepCoordinates()).toEqual(before);
});
