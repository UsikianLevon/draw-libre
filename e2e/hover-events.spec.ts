import { expect, test } from "./fixtures";

const HOVERED_POINTS = [
  ["middle", 1],
  ["first", 0],
] as const;

for (const [name, index] of HOVERED_POINTS) {
  test(`entering and leaving the ${name} point reports its id, its coordinates and the total`, async ({ drawMap }) => {
    const line = await drawMap.openWithLine();
    const id = await drawMap.events.idOf("mdl:add", index);
    await drawMap.sweepPointer();
    const enters = await drawMap.events.count("mdl:pointenter");

    await drawMap.canvas.hoverThrough(line[name]);

    await drawMap.events.expectCount("mdl:pointenter", enters + 1);
    await drawMap.events.expectUnchanged("mdl:pointenter", enters + 1);
    const entered = await drawMap.events.lastPayload("mdl:pointenter");
    expect(entered).toMatchObject({ id, total: 3 });
    await drawMap.drawing.expectCoordinatesAt(entered.coordinates, line[name]);

    const leaves = await drawMap.events.count("mdl:pointleave");
    await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

    await drawMap.events.expectCount("mdl:pointleave", leaves + 1);
    await drawMap.events.expectUnchanged("mdl:pointleave", leaves + 1);
    const left = await drawMap.events.lastPayload("mdl:pointleave");
    expect(left).toMatchObject({ id, total: 3 });
    await drawMap.drawing.expectCoordinatesAt(left.coordinates, line[name]);
  });
}

test("in auto mode a generated midpoint reports its own id and a total that counts it", async ({ drawMap }) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);
  await drawMap.drawing.expectAuxiliaryCount(1);
  const primaryIds = [await drawMap.events.idOf("mdl:add", 0), await drawMap.events.idOf("mdl:add", 1)];
  const auxiliary = (await drawMap.drawing.steps()).find((step) => step.isAuxiliary);
  await drawMap.sweepPointer();
  const enters = await drawMap.events.count("mdl:pointenter");

  await drawMap.canvas.hoverThrough(pair.midpoint);

  await drawMap.events.expectCount("mdl:pointenter", enters + 1);
  await drawMap.events.expectUnchanged("mdl:pointenter", enters + 1);
  const entered = await drawMap.events.lastPayload("mdl:pointenter");
  expect(entered.total).toBe(3);
  expect(typeof entered.id).toBe("string");
  expect(primaryIds).not.toContain(entered.id);
  expect(entered.id).toBe(auxiliary?.id);
  await drawMap.drawing.expectCoordinatesAt(entered.coordinates, pair.midpoint);

  const leaves = await drawMap.events.count("mdl:pointleave");
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

  await drawMap.events.expectCount("mdl:pointleave", leaves + 1);
  await drawMap.events.expectUnchanged("mdl:pointleave", leaves + 1);
  expect(await drawMap.events.lastPayload("mdl:pointleave")).toMatchObject({ id: entered.id, total: 3 });
});

test("with the drawing mode turned off, hovering a point reports nothing until the mode is back", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.modes.chooseLine();
  await drawMap.modes.expectNoneActive();
  await drawMap.sweepPointer();
  const snapshot = await drawMap.snapshot();

  await drawMap.canvas.hoverThrough(line.middle);
  await drawMap.canvas.hoverThrough(drawMap.layout.emptySpot);

  await drawMap.expectNothingHappenedSince(snapshot);

  await drawMap.modes.chooseLine();
  await drawMap.modes.expectLineActive();
  await drawMap.canvas.hoverThrough(line.middle);
  await drawMap.events.expectCount("mdl:pointenter", snapshot.events["mdl:pointenter"] + 1);
  await drawMap.events.expectUnchanged("mdl:pointenter", snapshot.events["mdl:pointenter"] + 1);
});
