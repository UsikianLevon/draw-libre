import { test } from "./fixtures";
import { OPEN_STEPS } from "./support/steps";

test("after the first point the dynamic line runs from it to the cursor", async ({ drawMap }) => {
  await drawMap.open();
  const first = drawMap.layout.line.first;
  const cursor = drawMap.layout.offsetFrom(first, 200, 150);

  await drawMap.drawPoint(first);
  await drawMap.canvas.hoverThrough(cursor);

  await drawMap.drawing.expectDynamicLineFrom(first);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});

test("after the second point the dynamic line starts at the second point", async ({ drawMap }) => {
  await drawMap.open();
  const { first, middle } = drawMap.layout.line;

  await drawMap.drawPoint(first);
  await drawMap.drawPoint(middle);
  const cursor = await drawMap.sweepPointer();

  await drawMap.drawing.expectDynamicLineFrom(middle);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});

test("the dynamic line hides over a point and follows the cursor again after leaving it", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.sweepPointer();

  await drawMap.canvas.hoverThrough(line.middle);
  await drawMap.drawing.expectDynamicLineHidden();

  const cursor = await drawMap.sweepPointer();
  await drawMap.drawing.expectDynamicLineFrom(line.last);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});

test("the dynamic line hides over a segment and follows the cursor again after leaving it", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.sweepPointer();

  await drawMap.canvas.hoverThrough(drawMap.layout.segmentMidpoint(line.first, line.middle));
  await drawMap.drawing.expectDynamicLineHidden();

  const cursor = await drawMap.sweepPointer();
  await drawMap.drawing.expectDynamicLineFrom(line.last);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});

test("closing the line hides the dynamic line", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.closeByClickingFirst(line.first);
  await drawMap.sweepPointer();

  await drawMap.drawing.expectDynamicLineHidden();
});

test("saving with clearing hides the dynamic line", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: { panel: { buttons: { save: { clearOnSave: true } } } } });

  await drawMap.save();
  await drawMap.sweepPointer();

  await drawMap.drawing.expectDynamicLineHidden();
});

test("delete all hides the dynamic line", async ({ drawMap }) => {
  await drawMap.openWithLine();

  await drawMap.deleteAll();
  await drawMap.sweepPointer();

  await drawMap.drawing.expectDynamicLineHidden();
});

test("turning the mode off hides the dynamic line", async ({ drawMap }) => {
  await drawMap.openWithLine();

  await drawMap.modes.chooseLine();
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: null });
  await drawMap.sweepPointer();

  await drawMap.drawing.expectDynamicLineHidden();
});

test("with the dynamicLine option off no line follows the cursor", async ({ drawMap }) => {
  await drawMap.open({ options: { dynamicLine: false } });
  const { first, middle } = drawMap.layout.line;

  await drawMap.drawPoint(first);
  await drawMap.drawPoint(middle);
  await drawMap.sweepPointer();

  await drawMap.drawing.expectDynamicLineHidden();
});

test("steps from the initial option get a dynamic line from their last point as soon as the pointer moves", async ({
  drawMap,
}) => {
  await drawMap.open({
    options: { initial: { geometry: "line", closeGeometry: false, generateId: true, steps: OPEN_STEPS } },
  });
  const path = await drawMap.drawing.pathOf(await drawMap.drawing.steps(), false);
  const cursor = drawMap.layout.offsetFrom(drawMap.layout.emptySpot, 60, 0);

  // один прыжок не даёт указателю пересечь точку или линию, иначе линия вернулась бы и без правки
  await drawMap.canvas.hover(drawMap.layout.emptySpot);
  await drawMap.canvas.hoverThrough(cursor);

  await drawMap.drawing.expectDynamicLineFrom(path[2]!);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});

test("while a point is dragged there is no dynamic line, and after the release it follows the cursor again", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  const to = drawMap.layout.offsetFrom(line.middle, 0, 80);
  const cursor = drawMap.layout.offsetFrom(drawMap.layout.emptySpot, 200, -40);
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

  await drawMap.canvas.press(line.middle);
  await drawMap.canvas.dragTo(to);
  await drawMap.drawing.expectDynamicLineHidden();
  await drawMap.canvas.release();

  await drawMap.canvas.hoverThrough(cursor);

  await drawMap.drawing.expectDynamicLineFrom(line.last);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});

test("after a click on the last point and a drag the dynamic line still hides over a point and during the next drag", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  const to = drawMap.layout.offsetFrom(line.middle, 0, 80);
  await drawMap.sweepPointer();

  await drawMap.canvas.hoverThrough(line.last);
  await drawMap.canvas.click(line.last);
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);
  await drawMap.dragPoint(line.middle, to);
  await drawMap.sweepPointer();

  await drawMap.canvas.hoverThrough(line.first);
  await drawMap.drawing.expectDynamicLineHidden();

  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);
  await drawMap.canvas.hoverThrough(to);
  await drawMap.canvas.press(to);
  await drawMap.canvas.dragTo(drawMap.layout.offsetFrom(to, 40, 40));
  await drawMap.drawing.expectDynamicLineHidden();
  await drawMap.canvas.release();
});

test("in auto mode no dynamic line appears while a generated midpoint is held", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: { pointGeneration: "auto" } });
  const midpoint = drawMap.layout.segmentMidpoint(line.first, line.middle);
  await drawMap.sweepPointer();

  await drawMap.canvas.hoverThrough(midpoint);
  await drawMap.canvas.press(midpoint);
  await drawMap.drawing.expectDynamicLineHidden();

  await drawMap.canvas.release();
});

test("in auto mode a click on a generated midpoint shows no dynamic line while the pointer stays on it", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine({ options: { pointGeneration: "auto" } });
  const midpoint = drawMap.layout.segmentMidpoint(line.first, line.middle);
  await drawMap.sweepPointer();

  await drawMap.canvas.hoverThrough(midpoint);
  await drawMap.canvas.click(midpoint);
  await drawMap.drawing.expectDynamicLineHidden();

  const cursor = await drawMap.sweepPointer();
  await drawMap.drawing.expectDynamicLineFrom(line.last);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);
});
