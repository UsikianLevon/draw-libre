import { test } from "./fixtures";

test("with no options the side control shows three idle buttons with stock labels and a click draws nothing", async ({
  drawMap,
}) => {
  await drawMap.open({ bare: true });

  await drawMap.modes.expectButtons(["line", "polygon", "break"]);
  await drawMap.modes.expectNoneActive();
  await drawMap.modes.expectBreakDisabled();
  await drawMap.modes.expectLabelled("line", "Line");
  await drawMap.modes.expectLabelled("polygon", "Polygon");
  await drawMap.modes.expectLabelled("break", "Split");
  await drawMap.drawing.expectCursor("auto");
  await drawMap.events.expectCount("mdl:modechanged", 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: null });

  const before = await drawMap.snapshot();
  await drawMap.canvas.click(drawMap.layout.line.first);

  await drawMap.expectNothingHappenedSince(before);
  await drawMap.panel.expectHidden();
});

test("with no options choosing line draws with a medium panel of four buttons and stock labels", async ({
  drawMap,
}) => {
  await drawMap.open({ bare: true });
  const first = drawMap.layout.line.first;

  await drawMap.modes.chooseLine();
  await drawMap.modes.expectLineActive();
  await drawMap.drawing.expectCursor("crosshair");
  await drawMap.drawPoint(first);

  await drawMap.panel.expectVisible();
  await drawMap.panel.expectAbove(first);
  await drawMap.panel.expectButtons(["undo", "redo", "delete", "save"]);
  await drawMap.panel.expectButtonSize(24);
  await drawMap.panel.expectLabelled("undo", "Undo");
  await drawMap.panel.expectLabelled("redo", "Redo");
  await drawMap.panel.expectLabelled("delete", "Delete all");
  await drawMap.panel.expectLabelled("save", "Save");
});

test("with no options the dynamic line follows the cursor and a click on a segment inserts a point", async ({
  drawMap,
}) => {
  await drawMap.open({ bare: true });
  await drawMap.modes.chooseLine();
  const { first, middle, last } = drawMap.layout.line;
  await drawMap.drawPoint(first);
  await drawMap.drawPoint(middle);
  await drawMap.drawPoint(last);

  const cursor = await drawMap.sweepPointer();
  await drawMap.drawing.expectDynamicLineFrom(last);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);

  await drawMap.drawPoint(drawMap.layout.segmentMidpoint(first, middle));

  await drawMap.events.expectLastTotal("mdl:add", 4);
  await drawMap.drawing.expectPointCount(4);
  const [a, b, c, inserted] = await Promise.all([0, 1, 2, 3].map((index) => drawMap.events.idOf("mdl:add", index)));
  await drawMap.drawing.expectStepOrder([a!, inserted!, b!, c!]);
});

test("with no options three points and a click on the first close the line", async ({ drawMap }) => {
  await drawMap.open({ bare: true });
  await drawMap.modes.chooseLine();
  const triangle = await drawMap.drawTriangle();
  await drawMap.parkPointer();

  await drawMap.hoverPoint(triangle.a);
  await drawMap.tooltip.expectShowing("Close the line");

  await drawMap.closeByClickingFirst(triangle.a);

  await drawMap.drawing.expectClosed();
  await drawMap.modes.expectBreakEnabled();
});

test("with no options the first of three polygon points offers the stock closing label", async ({ drawMap }) => {
  await drawMap.open({ bare: true });
  await drawMap.modes.choosePolygon();
  const triangle = await drawMap.drawTriangle();
  await drawMap.parkPointer();

  await drawMap.hoverPoint(triangle.a);

  await drawMap.tooltip.expectShowing("Create a polygon");
});
