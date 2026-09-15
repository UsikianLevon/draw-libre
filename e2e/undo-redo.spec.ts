import { test, expect } from "./fixtures";
import type { Drawing } from "./support/drawing";

const shapeOf = async (drawing: Drawing) =>
  (await drawing.steps()).map((step) => [step.lng, step.lat, step.isAuxiliary === true]);

test("undoing two points one by one empties the map, and redoing both brings them back with their ids", async ({
  drawMap,
}) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  const coordinates = await drawMap.drawing.stepCoordinates();

  await drawMap.undo();
  await drawMap.undo();

  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectUndoDisabled();
  await drawMap.panel.expectRedoEnabled();
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 0 });

  // на пустой карте панель скрыта, поэтому её кнопка redo недоступна
  await drawMap.api.redo();
  await drawMap.events.expectCount("mdl:redo", 1);
  await drawMap.drawing.expectStepOrder([ids[0]!]);

  await drawMap.api.redo();
  await drawMap.events.expectCount("mdl:redo", 2);
  await drawMap.drawing.expectStepOrder(ids);
  await drawMap.drawing.expectPointCount(2);
  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(coordinates);
});

const OPEN_STEPS = [
  { lat: 5, lng: -12 },
  { lat: 5, lng: -2 },
  { lat: -3, lng: 4 },
];

test("undo and redo start disabled, and the first point enables only undo", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.panel.expectUndoDisabled();
  await drawMap.panel.expectRedoDisabled();

  await drawMap.drawPoint(drawMap.layout.line.first);

  await drawMap.panel.expectUndoEnabled();
  await drawMap.panel.expectRedoDisabled();
});

test("the history events report the length of each stack after every change", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;

  await drawMap.drawPoint(line.first);
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 1 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });

  await drawMap.drawPoint(line.middle);
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 2 });

  await drawMap.undo();
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 1 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 1 });

  await drawMap.redo();
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 2 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
});

test("undoing the only point empties the map and hides the panel, and redo brings the same point back", async ({
  drawMap,
}) => {
  await drawMap.open();
  await drawMap.drawPoint(drawMap.layout.line.first);
  const id = await drawMap.events.idOf("mdl:add", 0);

  await drawMap.undo();

  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectHidden();
  await drawMap.panel.expectRedoEnabled();

  await drawMap.api.redo();

  await drawMap.events.expectCount("mdl:redo", 1);
  await drawMap.drawing.expectStepOrder([id]);
  await drawMap.drawing.expectPointCount(1);
});

test("a new action after undo leaves nothing to redo", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.undo();
  await drawMap.panel.expectRedoEnabled();

  await drawMap.drawPoint(line.last);

  await drawMap.panel.expectRedoDisabled();
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
});

test("undo and redo of every kind of edit give back exactly the same steps", async ({ drawMap }) => {
  await drawMap.open();
  const { a, b, c } = drawMap.layout.triangle;
  const inserted = drawMap.layout.segmentMidpoint(a, b);
  const moved = drawMap.layout.offsetFrom(c, 0, 40);

  const roundTrip = async (edit: () => Promise<void>, closed?: { before: boolean; after: boolean }) => {
    const undoLength = (await drawMap.events.lastPayload("mdl:undostackchanged")).length as number;
    const before = await drawMap.drawing.steps();
    const beforePath = await drawMap.drawing.pathOf(before, closed?.before ?? false);
    await edit();
    const after = await drawMap.drawing.steps();
    const afterPath = await drawMap.drawing.pathOf(after, closed?.after ?? false);
    await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: undoLength + 1 });
    await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });

    await drawMap.undo();
    await expect.poll(() => drawMap.drawing.steps()).toEqual(before);
    if (closed) await expect.poll(() => drawMap.drawing.isClosed()).toBe(closed.before);
    await drawMap.drawing.expectLineAlong(beforePath);
    await drawMap.drawing.expectLineGoneFrom(afterPath, beforePath);
    await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: undoLength });
    await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 1 });
    await drawMap.drawing.expectPointCount(before.length);
    for (const step of before) {
      await drawMap.drawing.expectPointNear(await drawMap.drawing.pixelOf(step), 2);
    }

    await drawMap.redo();
    await expect.poll(() => drawMap.drawing.steps()).toEqual(after);
    if (closed) await expect.poll(() => drawMap.drawing.isClosed()).toBe(closed.after);
    await drawMap.drawing.expectLineAlong(afterPath);
    await drawMap.drawing.expectLineGoneFrom(beforePath, afterPath);
    await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: undoLength + 1 });
    await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
    await drawMap.drawing.expectPointCount(after.length);
    for (const step of after) {
      await drawMap.drawing.expectPointNear(await drawMap.drawing.pixelOf(step), 2);
    }
  };

  await drawMap.drawPoint(a);
  await drawMap.drawPoint(b);

  await roundTrip(() => drawMap.drawPoint(c));
  await roundTrip(() => drawMap.drawPoint(inserted));
  await roundTrip(async () => {
    const moves = await drawMap.events.count("mdl:moveend");
    await drawMap.dragPoint(c, moved);
    await drawMap.events.expectCount("mdl:moveend", moves + 1);
  });
  await roundTrip(async () => {
    const removals = await drawMap.events.count("mdl:pointremove");
    await drawMap.parkPointer();
    await drawMap.hoverPoint(inserted);
    await drawMap.removePointUnderPointer();
    await drawMap.events.expectCount("mdl:pointremove", removals + 1);
  });
  await roundTrip(() => drawMap.closeByClickingFirst(a), { before: false, after: true });
  await roundTrip(
    async () => {
      await drawMap.enterBreakMode();
      await drawMap.breakAt(b, moved);
    },
    { before: true, after: false },
  );
});

test("undo and redo of turning a generated midpoint into a point give back exactly the same steps", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const pair = drawMap.layout.rowPair;
  await drawMap.drawPoint(pair.left);
  await drawMap.drawPoint(pair.right);
  const before = await drawMap.drawing.steps();
  const beforePath = await drawMap.drawing.pathOf(before, false);
  const undoLength = (await drawMap.events.lastPayload("mdl:undostackchanged")).length as number;

  const dropped = drawMap.layout.offsetFrom(pair.midpoint, 0, 60);
  await drawMap.dragPoint(pair.midpoint, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: undoLength + 1 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
  const after = await drawMap.drawing.steps();
  const afterPath = await drawMap.drawing.pathOf(after, false);

  await drawMap.undo();
  await expect.poll(() => drawMap.drawing.steps()).toEqual(before);
  await drawMap.drawing.expectLineAlong(beforePath);
  await drawMap.drawing.expectLineGoneFrom(afterPath, beforePath);
  await drawMap.drawing.expectPrimaryCount(2);
  await drawMap.drawing.expectAuxiliaryCount(1);
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: undoLength });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 1 });

  await drawMap.redo();
  await expect.poll(() => drawMap.drawing.steps()).toEqual(after);
  await drawMap.drawing.expectLineAlong(afterPath);
  await drawMap.drawing.expectLineGoneFrom(beforePath, afterPath);
  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectPointNear(dropped, 2);
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: undoLength + 1 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
});

test("undo and redo events carry the last remaining point and how many are left", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  const first = (await drawMap.drawing.steps())[0]!;

  await drawMap.undo();

  expect(await drawMap.events.payloadOf("mdl:undo", 0)).toMatchObject({
    id: first.id,
    coordinates: { lat: first.lat, lng: first.lng },
    total: 1,
    hasOriginalEvent: true,
  });

  await drawMap.undo();

  const emptied = await drawMap.events.payloadOf("mdl:undo", 1);
  expect(emptied).not.toHaveProperty("id");
  expect(emptied.total).toBe(0);

  await drawMap.api.redo();

  await drawMap.events.expectCount("mdl:redo", 1);
  expect(await drawMap.events.payloadOf("mdl:redo", 0)).toMatchObject({
    id: first.id,
    total: 1,
    hasOriginalEvent: true,
  });
});

test("undo and redo through the API do what the buttons do and fire the same events", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);

  await drawMap.api.undo();

  await drawMap.events.expectCount("mdl:undo", 1);
  await drawMap.drawing.expectStepOrder([ids[0]!]);
  await drawMap.drawing.expectPointCount(1);
  await drawMap.panel.expectRedoEnabled();

  await drawMap.api.redo();

  await drawMap.events.expectCount("mdl:redo", 1);
  await drawMap.drawing.expectStepOrder(ids);
  await drawMap.drawing.expectPointCount(2);
});

test("after steps from the initial option, undo takes back only the point drawn later", async ({ drawMap }) => {
  await drawMap.open({
    options: { initial: { geometry: "line", closeGeometry: false, generateId: true, steps: OPEN_STEPS } },
  });
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  await drawMap.drawing.expectPointCount(3);
  await drawMap.panel.expectUndoDisabled();

  await drawMap.drawPoint(drawMap.layout.emptySpot);
  await drawMap.panel.expectUndoEnabled();

  await drawMap.undo();

  await drawMap.drawing.expectStepOrder(ids);
  await drawMap.drawing.expectPointCount(3);
  await drawMap.panel.expectUndoDisabled();
});

test("after delete all, undo takes back only what was drawn afterwards", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.deleteAll();

  await drawMap.drawPoint(line.last);
  await drawMap.undo();

  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectUndoDisabled();
});

for (const pointGeneration of ["manual", "auto"] as const) {
  test(`in ${pointGeneration} mode, undoing the removal of the only point shows it with the panel and the next point joins it`, async ({
    drawMap,
  }) => {
    await drawMap.open({ options: { pointGeneration } });
    const line = drawMap.layout.line;
    await drawMap.drawPoint(line.first);
    await drawMap.parkPointer();
    await drawMap.hoverPoint(line.first);
    await drawMap.removePointUnderPointer();
    await drawMap.drawing.expectEmpty();

    // панель прячется вместе с последней точкой, её кнопка undo недоступна
    await drawMap.api.undo();
    await drawMap.events.expectCount("mdl:undo", 1);

    await drawMap.drawing.expectPointCount(1);
    await drawMap.panel.expectVisible();

    await drawMap.drawPoint(line.last);

    await drawMap.drawing.expectPrimaryCount(2);
    await drawMap.drawing.expectLineAlong([line.first, line.last]);

    await drawMap.undo();

    await drawMap.drawing.expectPrimaryCount(1);
    await drawMap.drawing.expectPointNear(line.first);
    await drawMap.panel.expectVisible();
  });

  test(`in ${pointGeneration} mode, removing both points and undoing twice brings both back`, async ({ drawMap }) => {
    await drawMap.open({ options: { pointGeneration } });
    const line = drawMap.layout.line;
    await drawMap.drawPoint(line.first);
    await drawMap.drawPoint(line.middle);
    const before = await drawMap.drawing.stepCoordinates();

    await drawMap.parkPointer();
    await drawMap.hoverPoint(line.middle);
    await drawMap.removePointUnderPointer();
    await drawMap.events.expectCount("mdl:pointremove", 1);
    await drawMap.parkPointer();
    await drawMap.hoverPoint(line.first);
    await drawMap.removePointUnderPointer();
    await drawMap.drawing.expectEmpty();

    await drawMap.api.undo();
    await drawMap.events.expectCount("mdl:undo", 1);
    await drawMap.drawing.expectPointCount(1);
    await drawMap.undo();

    await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(before);
    await drawMap.drawing.expectPrimaryCount(2);
    await drawMap.drawing.expectLineAlong([line.first, line.middle]);
  });
}

test("in auto mode, redoing a removal and then a midpoint drag puts the point where it was dropped", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.drawPoint(line.last);
  await drawMap.parkPointer();
  await drawMap.hoverPoint(line.middle);
  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectPointCount(3);
  const midpoint = drawMap.layout.segmentMidpoint(line.first, line.last);
  const dropped = drawMap.layout.offsetFrom(midpoint, 0, 90);
  await drawMap.dragPoint(midpoint, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  const afterDrag = await drawMap.drawing.stepCoordinates();

  await drawMap.undo();
  await drawMap.undo();
  await drawMap.redo();
  await drawMap.redo();

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(afterDrag);
  await drawMap.drawing.expectPointNear(dropped, 3);
  await drawMap.drawing.expectNoPointNear(midpoint, 3);
});

test("in auto mode, undo after redoing a removal and a midpoint press gives back the closed shape exactly", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const square = await drawMap.drawClosedSquare();
  const shape = () => shapeOf(drawMap.drawing);
  const closedSquare = await shape();

  await drawMap.parkPointer();
  await drawMap.hoverPoint(square.bottomLeft);
  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectPointCount(6);
  const closingMidpoint = drawMap.layout.segmentMidpoint(square.bottomRight, square.topLeft);
  await drawMap.canvas.press(closingMidpoint);
  await drawMap.canvas.release();
  await drawMap.drawing.expectPointCount(8);

  await drawMap.undo();
  await drawMap.undo();
  await drawMap.redo();
  await drawMap.redo();
  await drawMap.undo();
  await drawMap.undo();

  await expect.poll(shape).toEqual(closedSquare);
  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectAuxiliaryCount(4);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
});

test("in auto mode, redoing the removal of the first point of a closed shape gives back the shape without it, still closed", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const square = await drawMap.drawClosedSquare();
  const shape = () => shapeOf(drawMap.drawing);
  const closedSquare = await shape();
  const squarePath = await drawMap.drawing.pathOf(await drawMap.drawing.steps(), true);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(square.topLeft);
  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectPointCount(6);
  const withoutFirst = await shape();
  const withoutFirstPath = await drawMap.drawing.pathOf(await drawMap.drawing.steps(), true);

  await drawMap.undo();
  await expect.poll(shape).toEqual(closedSquare);
  await drawMap.redo();

  await expect.poll(shape).toEqual(withoutFirst);
  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectAuxiliaryCount(3);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
  await drawMap.drawing.expectLineAlong(withoutFirstPath);

  await drawMap.undo();

  await expect.poll(shape).toEqual(closedSquare);
  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectAuxiliaryCount(4);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
  await drawMap.drawing.expectLineAlong(squarePath);
});

test("in auto mode, undo and redo of a removal that opens a closed triangle and of a midpoint drag after it give back every state", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const triangle = await drawMap.drawClosedTriangle();
  const capture = async (closed: boolean) => {
    const steps = await drawMap.drawing.steps();
    return {
      closed,
      shape: await shapeOf(drawMap.drawing),
      path: await drawMap.drawing.pathOf(steps, closed),
    };
  };
  const expectState = async (state: Awaited<ReturnType<typeof capture>>) => {
    await expect.poll(() => shapeOf(drawMap.drawing)).toEqual(state.shape);
    if (state.closed) {
      await drawMap.drawing.expectClosed();
    } else {
      await drawMap.drawing.expectOpen();
    }
    await drawMap.drawing.expectLineAlong(state.path);
  };
  const closedTriangle = await capture(true);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(triangle.b);
  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectOpen();
  const opened = await capture(false);

  const midpoints = (await drawMap.drawing.points()).filter((point) => point.auxiliary);
  expect(midpoints).toHaveLength(1);
  const dropped = drawMap.layout.offsetFrom(midpoints[0]!.px, 0, 60);
  await drawMap.dragPoint(midpoints[0]!.px, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  const dragged = await capture(false);

  await drawMap.undo();
  await expectState(opened);
  await drawMap.undo();
  await expectState(closedTriangle);
  await drawMap.redo();
  await expectState(opened);
  await drawMap.redo();
  await expectState(dragged);
  await drawMap.drawing.expectPointNear(dropped, 3);

  await drawMap.undo();
  await expectState(opened);
  await drawMap.undo();
  await expectState(closedTriangle);
  await drawMap.redo();
  await expectState(opened);
  await drawMap.redo();
  await expectState(dragged);
});

test("undo and redo through the API on an empty map still report the call and change nothing", async ({ drawMap }) => {
  await drawMap.open();
  const snapshot = await drawMap.snapshot();

  await drawMap.api.undo();
  await drawMap.api.redo();

  await drawMap.events.expectCount("mdl:undo", snapshot.events["mdl:undo"] + 1);
  await drawMap.events.expectCount("mdl:redo", snapshot.events["mdl:redo"] + 1);
  for (const name of ["mdl:undo", "mdl:redo"] as const) {
    const payload = await drawMap.events.lastPayload(name);
    expect(payload).not.toHaveProperty("id");
    expect(payload.coordinates).toEqual({});
    expect(payload.total).toBe(0);
  }
  await drawMap.events.expectUnchanged("mdl:undostackchanged", snapshot.events["mdl:undostackchanged"]);
  await drawMap.events.expectUnchanged("mdl:redostackchanged", snapshot.events["mdl:redostackchanged"]);
  await drawMap.drawing.expectEmpty();
});

test("redo through the API with nothing to redo reports the last point and changes nothing", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const lastId = await drawMap.events.idOf("mdl:add", 2);
  const coordinates = await drawMap.drawing.stepCoordinates();
  const snapshot = await drawMap.snapshot();

  await drawMap.api.redo();

  await drawMap.events.expectCount("mdl:redo", snapshot.events["mdl:redo"] + 1);
  const redone = await drawMap.events.lastPayload("mdl:redo");
  expect(redone).toMatchObject({ id: lastId, total: 3 });
  await drawMap.drawing.expectCoordinatesAt(redone.coordinates, line.last);
  await drawMap.events.expectUnchanged("mdl:undostackchanged", snapshot.events["mdl:undostackchanged"]);
  await drawMap.events.expectUnchanged("mdl:redostackchanged", snapshot.events["mdl:redostackchanged"]);
  expect(await drawMap.drawing.stepCoordinates()).toEqual(coordinates);
});

test("on a line of three, undo and redo report the point that is last after each of them", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const middleId = await drawMap.events.idOf("mdl:add", 1);

  await drawMap.undo();

  const undone = await drawMap.events.lastPayload("mdl:undo");
  expect(undone).toMatchObject({ id: middleId, total: 2 });
  await drawMap.drawing.expectCoordinatesAt(undone.coordinates, line.middle);

  await drawMap.undo();
  await drawMap.redo();

  const redone = await drawMap.events.lastPayload("mdl:redo");
  expect(redone).toMatchObject({ id: middleId, total: 2 });
  await drawMap.drawing.expectCoordinatesAt(redone.coordinates, line.middle);
});
