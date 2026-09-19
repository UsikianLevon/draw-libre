import { test, expect } from "./fixtures";

test("hovering a point reveals the remove button beside it", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.hoverPoint(line.middle);

  await drawMap.removeButton.expectVisible();
  await drawMap.removeButton.expectRightOf(line.middle);
  await drawMap.removeButton.expectVerticallyCentredOn(line.middle);
  await drawMap.removeButton.expectLabelled("Remove point");
});

test("the first point of a line gets a remove button too", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.hoverPoint(line.first);

  await drawMap.removeButton.expectVisible();
});

test("the button goes away when the pointer leaves the point", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.hoverPoint(line.middle);
  await drawMap.removeButton.expectVisible();

  await drawMap.parkPointer();

  await drawMap.removeButton.expectHidden();
});

test("a point you have just placed keeps its button until the pointer comes back to it", async ({ drawMap }) => {
  await drawMap.open();
  const only = drawMap.layout.line.first;

  await drawMap.drawPoint(only);
  await drawMap.hoverPoint(drawMap.layout.offsetFrom(only, 3, 0));

  await drawMap.removeButton.expectHidden();

  await drawMap.parkPointer();
  await drawMap.hoverPoint(only);

  await drawMap.removeButton.expectVisible();
});

test("drawing a line in a row never flashes a button", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;

  for (const at of [line.first, line.middle, line.last]) {
    await drawMap.drawPoint(at);
    await drawMap.hoverPoint(drawMap.layout.offsetFrom(at, 3, 0));
    await drawMap.removeButton.expectHidden();
  }
});

test("a point inserted into the line waits for a real hover before showing its button", async ({ drawMap }) => {
  await drawMap.open();
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);

  await drawMap.drawPoint(pair.midpoint);
  await drawMap.hoverPoint(drawMap.layout.offsetFrom(pair.midpoint, 3, 0));

  await drawMap.removeButton.expectHidden();

  await drawMap.parkPointer();
  await drawMap.hoverPoint(pair.midpoint);

  await drawMap.removeButton.expectVisible();
});

test("the click right after placing a point lands on the map instead of a remove button", async ({ drawMap }) => {
  await drawMap.open();
  const first = drawMap.layout.line.first;

  await drawMap.drawPoint(first);
  await drawMap.hoverPoint(drawMap.layout.offsetFrom(first, 3, 0));
  await drawMap.drawPoint(drawMap.layout.offsetFrom(first, 25, 0));

  await drawMap.events.expectCount("mdl:add", 2);
  await drawMap.events.expectNever("mdl:pointremove");
});

test("the button follows the pointer straight from one point to the next", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.hoverPoint(line.middle);
  await drawMap.removeButton.expectRightOf(line.middle);

  await drawMap.hoverPoint(line.last);

  await drawMap.removeButton.expectVisible();
  await drawMap.removeButton.expectRightOf(line.last);
});

test("clicking the edge of the first point never lands on the remove button", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.hoverPoint(line.first);
  await drawMap.removeButton.expectVisible();

  await drawMap.canvas.click(drawMap.layout.offsetFrom(line.first, 9, 0));

  await drawMap.events.expectNever("mdl:pointremove");
  await drawMap.drawing.expectPointCount(3);
});

test("the pointer can travel from the point onto the button", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.hoverPoint(line.middle);
  await drawMap.removeButton.expectVisible();

  await drawMap.walkPointerToRemoveButton();

  await drawMap.removeButton.expectVisible();
});

test("clicking the button removes the point it belongs to", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const middleId = await drawMap.events.idOf("mdl:add", 1);

  await drawMap.hoverPoint(line.middle);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.events.expectLastId("mdl:pointremove", middleId);
  await drawMap.events.expectLastTotal("mdl:pointremove", 2);
  await drawMap.removeButton.expectHidden();

  await drawMap.expectPointAt(line.first);
  await drawMap.expectBareMapAt(line.middle);
});

test("the dynamic line hangs off the cursor after a point is removed", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.hoverPoint(line.middle);
  const cursor = await drawMap.removeButton.centre();
  await drawMap.removePointUnderPointer();

  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});

test("the dynamic line hangs off the cursor after undo on an offset map", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ offset: true });

  const cursor = await drawMap.panel.centreOfUndo();
  await drawMap.panel.clickUndo();

  await drawMap.drawing.expectDynamicLineEndAt(cursor);
  await drawMap.drawing.expectDynamicLineFrom(line.middle);
});

test("the dynamic line hangs off the cursor after redo", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.panel.clickUndo();

  const cursor = await drawMap.panel.centreOfRedo();
  await drawMap.panel.clickRedo();

  await drawMap.drawing.expectDynamicLineEndAt(cursor);
  await drawMap.drawing.expectDynamicLineFrom(line.last);
});

test("after the last point is removed the dynamic line starts at the point before it", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.last);
  const cursor = await drawMap.removeButton.centre();

  await drawMap.removePointUnderPointer();

  await drawMap.drawing.expectDynamicLineFrom(line.middle);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});

test("right-clicking a point no longer removes it", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();

  await drawMap.canvas.rightClick(line.middle);

  await drawMap.events.expectNever("mdl:pointremove");
  await drawMap.expectPointAt(line.middle);
});

test("grabbing a point hides the button and dropping it brings the button back", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const dropped = drawMap.layout.offsetFrom(line.middle, 90, 70);

  await drawMap.hoverPoint(line.middle);
  await drawMap.removeButton.expectVisible();

  await drawMap.canvas.press(line.middle);
  await drawMap.removeButton.expectHidden();

  await drawMap.canvas.dragTo(dropped);
  await drawMap.canvas.release();

  await drawMap.removeButton.expectVisible();
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.expectPointAt(dropped);
  await drawMap.expectBareMapAt(line.middle);
});

test("the button keeps up when the camera moves under it", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.hoverPoint(line.middle);
  const before = await drawMap.removeButton.box();

  await drawMap.controls.zoomIn();

  await drawMap.removeButton.expectVisible();
  await drawMap.removeButton.expectMovedFrom(before);

  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.events.expectLastTotal("mdl:pointremove", 2);
});

test("removing the only point empties the drawing", async ({ drawMap }) => {
  await drawMap.open();
  const only = drawMap.layout.line.first;
  await drawMap.drawPoint(only);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(only);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.events.expectLastTotal("mdl:pointremove", 0);
  await drawMap.panel.expectHidden();
  await drawMap.expectBareMapAt(only);
});

test("undo brings a removed point back", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.hoverPoint(line.middle);
  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);

  const idles = await drawMap.canvas.idleCount();
  await drawMap.panel.clickUndo();
  await drawMap.canvas.waitUntilRepainted(idles);

  await drawMap.expectPointAt(line.middle);
});

test("a point near the right edge gets its button on the other side", async ({ drawMap }) => {
  await drawMap.open();
  const edge = drawMap.layout.nearRightEdge;
  await drawMap.drawPoint(edge);

  await drawMap.expectPointAt(edge);

  await drawMap.removeButton.expectLeftOf(edge);
});

test("changing the drawing mode dismisses the button", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.hoverPoint(line.middle);
  await drawMap.removeButton.expectVisible();

  await drawMap.modes.choosePolygon();

  await drawMap.modes.expectPolygonActive();
  await drawMap.removeButton.expectHidden();
});

test("generated midpoints carry no remove button", async ({ drawMap }) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);

  await drawMap.expectNoRemoveButtonAt(pair.midpoint);

  await drawMap.dragPoint(pair.midpoint, drawMap.layout.offsetFrom(pair.midpoint, 0, 60));
  await drawMap.events.expectCount("mdl:moveend", 1);
});

test("a point can be removed while midpoints are generated", async ({ drawMap }) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);

  const middleId = await drawMap.events.idOf("mdl:add", 1);

  await drawMap.hoverPoint(line.middle);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.events.expectLastId("mdl:pointremove", middleId);
  await drawMap.expectPointAt(line.first);
  await drawMap.expectPointAt(line.last);
});

test("removing points down to two opens the shape and gives polygon mode back without a mode change", async ({
  drawMap,
}) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.modes.expectPolygonDisabled();

  await drawMap.parkPointer();
  await drawMap.hoverPoint(triangle.b);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectOpen();
  await drawMap.drawing.expectPointCount(2);
  await drawMap.modes.expectBreakDisabled();
  await drawMap.modes.expectPolygonEnabled();
  await drawMap.modes.expectLineActive();
  await drawMap.events.expectUnchanged("mdl:modechanged", 1);

  await drawMap.drawPoint(drawMap.layout.emptySpot);
  expect((await drawMap.events.lastPayload("mdl:add")).mode).toEqual({ geometry: "line", closedGeometry: false });
});

test("removing the first point of a closed square leaves a closed triangle starting at the second point", async ({
  drawMap,
}) => {
  await drawMap.open();
  const square = await drawMap.drawClosedSquare();
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(square.topLeft);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectStepOrder(ids.slice(1));
  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectPointCount(3);
});

test("removing the last point of a closed shape keeps it closed", async ({ drawMap }) => {
  await drawMap.open();
  const square = await drawMap.drawClosedSquare();
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(square.bottomLeft);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectStepOrder(ids.slice(0, 3));
  await drawMap.drawing.expectClosed();
});

test("undo after a removal opened a shape closes it again with the same points", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(triangle.b);
  await drawMap.removePointUnderPointer();
  await drawMap.drawing.expectOpen();

  await drawMap.undo();

  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectStepOrder(ids);
});

test("the removal event carries the removed point and the count left behind", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const middle = (await drawMap.drawing.steps())[1]!;

  await drawMap.hoverPoint(line.middle);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  const removed = await drawMap.events.payloadOf("mdl:pointremove", 0);
  expect(removed).toMatchObject({ id: middle.id, coordinates: { lat: middle.lat, lng: middle.lng }, total: 2 });
});
