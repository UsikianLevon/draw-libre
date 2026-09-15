import { expect, test } from "./fixtures";
import { OPEN_STEPS } from "./support/steps";

const OPEN_COORDINATES = OPEN_STEPS.map((step) => [step.lng, step.lat]);
const OWN_STEPS = OPEN_STEPS.map((step, index) => ({ ...step, id: `own-${index}` }));
const POINT_AND_MODE_EVENTS = [
  "mdl:add",
  "mdl:pointremove",
  "mdl:moveend",
  "mdl:removeall",
  "mdl:undo",
  "mdl:redo",
  "mdl:modechanged",
] as const;

test("ids given with the steps are kept", async ({ drawMap }) => {
  await drawMap.open();

  await drawMap.api.setSteps(OWN_STEPS);

  await drawMap.drawing.expectStepOrder(["own-0", "own-1", "own-2"]);
});

test("setSteps refuses a value that is not an array and leaves the drawing as it was", async ({ drawMap }) => {
  await drawMap.openWithLine();
  const snapshot = await drawMap.snapshot();

  await expect(
    // приведение типа позволяет передать один шаг, это и есть проверяемый неверный ввод
    drawMap.api.setSteps(OPEN_STEPS[0] as never),
  ).rejects.toThrow("Invalid argument. Expected an array of steps.");

  await drawMap.expectNothingHappenedSince(snapshot);
  expect(await drawMap.drawing.steps()).toHaveLength(3);
});

test("findStepById returns the step with that id and null for an id it does not know", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const middleId = await drawMap.events.idOf("mdl:add", 1);

  const found = await drawMap.api.findStepById(middleId);

  expect(found).toMatchObject({ id: middleId });
  await drawMap.drawing.expectCoordinatesAt(found, line.middle);
  expect(await drawMap.api.findStepById("no-such-step")).toBeNull();
});

test("findNodeById names the neighbours of a point and returns null for an id it does not know", async ({
  drawMap,
}) => {
  await drawMap.openWithLine();
  const first = await drawMap.events.idOf("mdl:add", 0);
  const middle = await drawMap.events.idOf("mdl:add", 1);
  const last = await drawMap.events.idOf("mdl:add", 2);

  expect(await drawMap.api.findNodeById(middle)).toEqual({ id: middle, prevId: first, nextId: last });
  expect(await drawMap.api.findNodeById(first)).toEqual({ id: first, prevId: null, nextId: middle });
  expect(await drawMap.api.findNodeById("no-such-step")).toBeNull();
});

test("getAllSteps as a linked list reports its size, its ends and whether the shape is closed", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawTriangle();
  const a = await drawMap.events.idOf("mdl:add", 0);
  const c = await drawMap.events.idOf("mdl:add", 2);

  expect(await drawMap.api.getAllStepsAsLinkedList()).toEqual({ size: 3, headId: a, tailId: c, closed: false });

  await drawMap.closeByClickingFirst(triangle.a);

  expect(await drawMap.api.getAllStepsAsLinkedList()).toEqual({ size: 3, headId: a, tailId: c, closed: true });
});

test("steps set on an empty map are drawn in the given order with generated ids and the panel over the last", async ({
  drawMap,
}) => {
  await drawMap.open();
  const path = await Promise.all(OPEN_STEPS.map((step) => drawMap.drawing.pixelOf(step)));
  const snapshot = await drawMap.snapshot();

  await drawMap.api.setSteps(OPEN_STEPS);

  await drawMap.drawing.expectPointCount(3);
  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(OPEN_COORDINATES);
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  expect(new Set(ids).size).toBe(3);
  expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  await drawMap.drawing.expectLineAlong(path);
  await drawMap.drawing.expectOpen();
  await drawMap.panel.expectVisible();
  await drawMap.panel.expectAbove(path[2]!);
  for (const name of POINT_AND_MODE_EVENTS) {
    await drawMap.events.expectUnchanged(name, snapshot.events[name]);
  }
});

test("steps set over a drawing replace it and leave nothing to undo or redo", async ({ drawMap }) => {
  await drawMap.openWithLine();
  await drawMap.undo();
  await drawMap.panel.expectRedoEnabled();
  const path = await Promise.all(OPEN_STEPS.map((step) => drawMap.drawing.pixelOf(step)));
  const snapshot = await drawMap.snapshot();

  await drawMap.api.setSteps(OPEN_STEPS);

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(OPEN_COORDINATES);
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectLineAlong(path);
  await drawMap.panel.expectVisible();
  await drawMap.panel.expectUndoDisabled();
  await drawMap.panel.expectRedoDisabled();
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 0 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
  for (const name of POINT_AND_MODE_EVENTS) {
    await drawMap.events.expectUnchanged(name, snapshot.events[name]);
  }
});

test("an empty list of steps empties the map and hides the panel", async ({ drawMap }) => {
  await drawMap.openWithLine();

  await drawMap.api.setSteps([]);

  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectHidden();
  await drawMap.panel.expectUndoDisabled();
  expect(await drawMap.drawing.steps()).toEqual([]);
});

test("in auto mode steps set through the API get midpoints, and dragging the first point moves only that point", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });

  await drawMap.api.setSteps(OPEN_STEPS);

  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(2);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();

  const first = await drawMap.drawing.pixelOf(OPEN_STEPS[0]!);
  const dropped = drawMap.layout.offsetFrom(first, -40, 60);
  await drawMap.dragPoint(first, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);

  const primaries = (await drawMap.drawing.steps()).filter((step) => !step.isAuxiliary);
  expect(primaries).toHaveLength(3);
  await drawMap.drawing.expectCoordinatesAt(primaries[0], dropped);
  expect(primaries.slice(1).map((step) => ({ lat: step.lat, lng: step.lng }))).toEqual(OPEN_STEPS.slice(1));
  await drawMap.drawing.expectAuxiliaryCount(2);
  await drawMap.drawing.expectAuxiliaryPointsHalfway();
  await drawMap.drawing.expectOpen();
});

test("a drag after setSteps is undone back to the set coordinates and the set steps stay", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.api.setSteps(OPEN_STEPS);
  await drawMap.drawing.expectPointCount(3);
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  const middle = await drawMap.drawing.pixelOf(OPEN_STEPS[1]!);

  await drawMap.dragPoint(middle, drawMap.layout.offsetFrom(middle, 40, 60));
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.undo();

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(OPEN_COORDINATES);
  await drawMap.drawing.expectStepOrder(ids);
  await drawMap.drawing.expectPointCount(3);
  await drawMap.panel.expectUndoDisabled();
});

test("removeAllSteps empties the map, hides the panel, resets the history and reports it without an original event", async ({
  drawMap,
}) => {
  await drawMap.openWithLine();
  await drawMap.undo();
  await drawMap.panel.expectRedoEnabled();

  await drawMap.api.removeAllSteps();

  await drawMap.events.expectCount("mdl:removeall", 1);
  await drawMap.events.expectLastPayload("mdl:removeall", { hasOriginalEvent: false });
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectHidden();
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 0 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
});

test("after removeAllSteps a click draws again, the panel comes back and undo takes back only the new point", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.api.removeAllSteps();
  await drawMap.drawing.expectEmpty();

  await drawMap.drawPoint(line.middle);

  await drawMap.modes.expectLineActive();
  await drawMap.panel.expectVisible();
  await drawMap.panel.expectAbove(line.middle);
  await drawMap.undo();
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectUndoDisabled();
});

test("steps set over a closed shape start an open line that a click extends", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.drawClosedTriangle();
  await drawMap.modes.expectBreakEnabled();

  await drawMap.api.setSteps(OPEN_STEPS);

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(OPEN_COORDINATES);
  await drawMap.drawing.expectOpen();
  await drawMap.modes.expectLineActive();
  await drawMap.modes.expectBreakDisabled();
  await drawMap.modes.expectPolygonEnabled();

  const next = drawMap.layout.emptySpot;
  await drawMap.drawPoint(next);

  const steps = await drawMap.drawing.steps();
  expect(steps).toHaveLength(4);
  await drawMap.drawing.expectCoordinatesAt(steps[3], next);
  await drawMap.drawing.expectOpen();
});

test("steps set while break mode is on return to the drawing mode with one mode change and no point events", async ({
  drawMap,
}) => {
  await drawMap.open();
  await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  const snapshot = await drawMap.snapshot();

  await drawMap.api.setSteps(OPEN_STEPS);

  await expect.poll(() => drawMap.drawing.stepCoordinates()).toEqual(OPEN_COORDINATES);
  await drawMap.events.expectCount("mdl:modechanged", snapshot.events["mdl:modechanged"] + 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line" });
  await drawMap.events.expectUnchanged("mdl:modechanged", snapshot.events["mdl:modechanged"] + 1);
  await drawMap.modes.expectBreakInactive();
  await drawMap.modes.expectLineActive();
  for (const name of POINT_AND_MODE_EVENTS.filter((event) => event !== "mdl:modechanged")) {
    await drawMap.events.expectUnchanged(name, snapshot.events[name]);
  }
});
