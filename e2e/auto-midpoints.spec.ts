import { test, expect } from "./fixtures";

const AUTO = { pointGeneration: "auto" } as const;

const OPEN_STEPS = [
  { lat: 5, lng: -12 },
  { lat: 5, lng: -2 },
  { lat: -3, lng: 4 },
];

test("steps given in the initial option are drawn with their generated midpoints", async ({ drawMap }) => {
  await drawMap.open({
    options: { ...AUTO, initial: { geometry: "line", closeGeometry: false, generateId: true, steps: OPEN_STEPS } },
  });

  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(2);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
  await drawMap.drawing.expectOpen();
});

test("a closed shape from the initial option gets a midpoint on its closing segment too", async ({ drawMap }) => {
  await drawMap.open({
    options: {
      ...AUTO,
      initial: { geometry: "line", closeGeometry: true, generateId: true, steps: [...OPEN_STEPS, OPEN_STEPS[0]!] },
    },
  });

  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(3);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
  await drawMap.drawing.expectClosed();
});

test("generated midpoints appear from the second point on, one per segment, halfway along", async ({ drawMap }) => {
  await drawMap.open({ options: AUTO });
  const line = drawMap.layout.line;

  await drawMap.drawPoint(line.first);
  await drawMap.events.expectUnchanged("mdl:add", 1);
  await drawMap.drawing.expectAuxiliaryCount(0);

  await drawMap.drawPoint(line.middle);
  await drawMap.drawing.expectAuxiliaryCount(1);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
  expect((await drawMap.events.payloadOf("mdl:add", 1)).total).toBe(3);

  await drawMap.drawPoint(line.last);
  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(2);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
});

test("undo of a point added in auto mode also takes away its generated midpoint", async ({ drawMap }) => {
  await drawMap.open({ options: AUTO });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  const before = await drawMap.drawing.stepCoordinates();
  await drawMap.drawPoint(line.middle);
  await drawMap.drawing.expectAuxiliaryCount(1);

  await drawMap.undo();

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(before);
  await drawMap.drawing.expectPrimaryCount(1);
  await drawMap.events.expectUnchanged("mdl:undo", 1);
  await drawMap.drawing.expectAuxiliaryCount(0);
});

test("closing three points adds a midpoint on the closing segment, and undo takes it away", async ({ drawMap }) => {
  await drawMap.open({ options: AUTO });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);
  const before = await drawMap.drawing.stepCoordinates();

  await drawMap.closeByClickingFirst(line.first);

  await drawMap.drawing.expectPointCount(6);
  await drawMap.drawing.expectAuxiliaryCount(3);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();

  await drawMap.undo();

  await drawMap.drawing.expectOpen();
  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(before);
  await drawMap.drawing.expectAuxiliaryCount(2);
});

test("removing a middle point merges its two midpoints into one, and undo restores both", async ({ drawMap }) => {
  await drawMap.open({ options: AUTO });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);
  const before = await drawMap.drawing.stepCoordinates();

  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.middle);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectPrimaryCount(2);
  await drawMap.drawing.expectAuxiliaryCount(1);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();

  await drawMap.undo();

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(before);
  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(2);
});

test("removing the last point drops only its midpoint, and undo restores both", async ({ drawMap }) => {
  await drawMap.open({ options: AUTO });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);
  const before = await drawMap.drawing.stepCoordinates();

  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.last);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectPrimaryCount(2);
  await drawMap.drawing.expectAuxiliaryCount(1);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();

  await drawMap.undo();

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(before);
  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(2);
});

test("removing a point from a closed shape of three opens it for drawing again", async ({ drawMap }) => {
  await drawMap.open({ options: AUTO });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);
  await drawMap.closeByClickingFirst(line.first);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.middle);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectOpen();
  await drawMap.drawing.expectPointCount(3);

  await drawMap.drawPoint(drawMap.layout.emptySpot);
  expect((await drawMap.events.lastPayload("mdl:add")).mode).toEqual({ geometry: "line", closedGeometry: false });
});

test("undo after removing a point from a closed shape of three closes it with the same points", async ({ drawMap }) => {
  await drawMap.open({ options: AUTO });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);
  await drawMap.closeByClickingFirst(line.first);
  const shape = async () =>
    (await drawMap.drawing.steps()).map((step) => [step.lng, step.lat, step.isAuxiliary === true]);
  const before = await shape();

  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.middle);
  await drawMap.removePointUnderPointer();
  await drawMap.drawing.expectOpen();

  await drawMap.undo();

  await drawMap.drawing.expectClosed();
  await expect.poll(shape).toEqual(before);
  await drawMap.drawing.expectAuxiliaryCount(3);
});

test("a save lists the generated midpoints marked as auxiliary", async ({ drawMap }) => {
  await drawMap.open({ options: { ...AUTO, panel: { buttons: { save: { clearOnSave: false } } } } });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);

  await drawMap.panel.clickSave();

  await drawMap.events.expectCount("mdl:save", 1);
  const saved = await drawMap.events.payloadOf("mdl:save", 0);
  expect((saved.steps as { isAuxiliary?: boolean }[]).map((step) => step.isAuxiliary)).toEqual([false, true, false]);
});

test("removing the first point drops only its midpoint and the line then starts at the second point", async ({
  drawMap,
}) => {
  await drawMap.open({ options: AUTO });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);
  const middleId = await drawMap.events.idOf("mdl:add", 1);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.first);
  await drawMap.removePointUnderPointer();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectPrimaryCount(2);
  await drawMap.drawing.expectAuxiliaryCount(1);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
  expect((await drawMap.drawing.steps())[0]?.id).toBe(middleId);
});
