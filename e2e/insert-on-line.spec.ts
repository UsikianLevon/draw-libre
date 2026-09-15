import { test, expect } from "./fixtures";

test("a click in the middle of a segment inserts a point between its ends", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);

  await drawMap.drawPoint(drawMap.layout.segmentMidpoint(line.first, line.middle));

  const inserted = await drawMap.events.payloadOf("mdl:add", 3);
  expect(inserted.total).toBe(4);
  await drawMap.drawing.expectStepOrder([ids[0]!, inserted.id as string, ids[1]!, ids[2]!]);
  await drawMap.drawing.expectPointCount(4);
});

test("a point inserted on the closing segment lands between the last and the first point", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.closeByClickingFirst(line.first);
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);

  await drawMap.drawPoint(drawMap.layout.segmentMidpoint(line.last, line.first));

  const inserted = await drawMap.events.payloadOf("mdl:add", 3);
  expect(inserted).toMatchObject({ total: 4, mode: { geometry: "line", closedGeometry: true } });
  await drawMap.drawing.expectStepOrder([...ids, inserted.id as string]);
  await drawMap.drawing.expectClosed();
});

test("undo takes an inserted point out and redo puts it back in the same place", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const before = await drawMap.drawing.steps();
  await drawMap.drawPoint(drawMap.layout.segmentMidpoint(line.first, line.middle));
  const after = await drawMap.drawing.steps();

  await drawMap.undo();

  await expect.poll(() => drawMap.drawing.steps()).toEqual(before);
  await drawMap.drawing.expectPointCount(3);

  await drawMap.redo();

  await expect.poll(() => drawMap.drawing.steps()).toEqual(after);
  await drawMap.drawing.expectPointCount(4);
});

test("in auto mode a click on a segment adds nothing", async ({ drawMap }) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);

  // сгенерированная середина лежит посередине сегмента, клик туда захватывает её вместо вставки
  await drawMap.canvas.click(drawMap.layout.alongSegment(line.first, line.middle, 0.25));

  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.drawing.expectPointCount(5);
});
