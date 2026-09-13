import { test } from "./fixtures";

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

  await drawMap.dynamicLine.expectFreeEndAt(cursor);
});

test("the dynamic line hangs off the cursor after undo on an offset map", async ({ drawMap }) => {
  await drawMap.openWithLine({ offset: true });

  const cursor = await drawMap.panel.centreOfUndo();
  await drawMap.panel.clickUndo();

  await drawMap.dynamicLine.expectFreeEndAt(cursor);
});

test("the dynamic line hangs off the cursor after redo", async ({ drawMap }) => {
  await drawMap.openWithLine();
  await drawMap.panel.clickUndo();

  const cursor = await drawMap.panel.centreOfRedo();
  await drawMap.panel.clickRedo();

  await drawMap.dynamicLine.expectFreeEndAt(cursor);
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
  await drawMap.panel.expectOutOfReach();
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
  await drawMap.open({ pointGeneration: "auto" });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);

  await drawMap.expectNoRemoveButtonAt(pair.midpoint);

  await drawMap.dragPoint(pair.midpoint, drawMap.layout.offsetFrom(pair.midpoint, 0, 60));
  await drawMap.events.expectCount("mdl:moveend", 1);
});

test("a point can be removed while midpoints are generated", async ({ drawMap }) => {
  await drawMap.open({ pointGeneration: "auto" });
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
