import { test, expect } from "./fixtures";

test("clicking the first point closes the line", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.canvas.click(line.first);

  await drawMap.drawing.expectClosed();
  expect(await drawMap.drawing.steps()).toHaveLength(3);
});

test("a nudge shorter than the click tolerance still counts as a click on the first point", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.canvas.press(line.first);
  await drawMap.canvas.dragTo(drawMap.layout.offsetFrom(line.first, 2, 0));
  await drawMap.canvas.release();

  await drawMap.drawing.expectClosed();
});

test("two points do not close when the first one is clicked", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);

  await drawMap.canvas.click(line.first);

  await drawMap.events.expectUnchanged("mdl:add", 2);
  await drawMap.drawing.expectPointCount(2);
  await drawMap.drawing.expectOpen();
  await drawMap.modes.expectBreakDisabled();
});

test("after closing, a click on the empty map or on any point, the first one included, adds nothing", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.closeByClickingFirst(line.first);
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  const stackEvents = await drawMap.events.count("mdl:undostackchanged");

  await drawMap.canvas.click(drawMap.layout.emptySpot);
  await drawMap.canvas.click(line.middle);
  await drawMap.canvas.click(line.last);
  await drawMap.parkPointer();
  await drawMap.canvas.click(line.first);

  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.events.expectUnchanged("mdl:undostackchanged", stackEvents);
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectStepOrder(ids);
  await drawMap.drawing.expectClosed();
});

test("closing a line enables break, disables polygon and keeps line active", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.closeByClickingFirst(line.first);

  await drawMap.modes.expectBreakEnabled();
  await drawMap.modes.expectPolygonDisabled();
  await drawMap.modes.expectLineActive();
});

test("closing a shape in polygon mode fills it and disables line", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: "polygon" } } });

  const triangle = await drawMap.drawClosedTriangle();

  const inside = drawMap.layout.centroid([triangle.a, triangle.b, triangle.c]);
  await drawMap.drawing.expectPolygonPainted(inside, true);
  await drawMap.modes.expectLineDisabled();
  await drawMap.modes.expectPolygonActive();
  await drawMap.modes.expectBreakEnabled();
});

test("undo opens a filled shape and redo closes and fills it again", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: "polygon" } } });
  const triangle = await drawMap.drawClosedTriangle();
  const inside = drawMap.layout.centroid([triangle.a, triangle.b, triangle.c]);

  await drawMap.undo();

  await drawMap.drawing.expectOpen();
  await drawMap.drawing.expectPolygonPainted(inside, false);
  await drawMap.modes.expectBreakDisabled();

  await drawMap.redo();

  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectPolygonPainted(inside, true);
});

test("hovering the first of three points shows the closing hint", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: { locale: { closeLine: "Close this line" } } });
  await drawMap.parkPointer();

  await drawMap.hoverPoint(line.first);

  await drawMap.tooltip.expectShowing("Close this line");
});

test("with closing turned off the first point behaves like any other point", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({
    options: { modes: { line: { closeGeometry: false } }, locale: { closeLine: "Close this line" } },
  });
  const first = (await drawMap.drawing.steps())[0]!;

  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.first);
  await drawMap.tooltip.expectNotShowing("Close this line");

  await drawMap.canvas.click(line.first);
  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.drawing.expectOpen();

  const dropped = drawMap.layout.offsetFrom(line.first, 0, 80);
  await drawMap.dragPoint(line.first, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.events.expectLastId("mdl:moveend", first.id);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(dropped);
  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.events.expectLastId("mdl:pointremove", first.id);
});
