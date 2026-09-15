import type { Step } from "../src/index";
import { expect, test } from "./fixtures";
import { closed, FOURTH_STEP, OPEN_STEPS } from "./support/steps";

const ERRORS = {
  empty:
    "You passed an empty initial array in the options. Please either remove the 'initial' property or include at least one element in the array.",
  missingIds:
    "You set 'generateId' to false but did not provide IDs for all steps. Please ensure all steps have IDs or set 'generateId' to true.",
  notEnough:
    "At least three points are required to close a polygon or a line. Please add more points or set 'closeGeometry' to false.",
  notClosed:
    "The first and last points of a polygon or a closed linestring must be the same. Please ensure the first and last points are equal or set 'closeGeometry' to false.",
};

const OWN_STEPS = OPEN_STEPS.map((step, index) => ({ ...step, id: `own-${index}` }));

test("an open line from the initial option has three points, a line and the panel above its last point", async ({
  drawMap,
}) => {
  await drawMap.open({
    options: { initial: { geometry: "line", closeGeometry: false, generateId: true, steps: OPEN_STEPS } },
  });
  const path = await Promise.all(OPEN_STEPS.map((step) => drawMap.drawing.pixelOf(step)));

  expect(await drawMap.drawing.stepCoordinates()).toEqual(OPEN_STEPS.map((step) => [step.lng, step.lat]));
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectLineAlong(path);
  await drawMap.drawing.expectOpen();
  await drawMap.panel.expectVisible();
  await drawMap.panel.expectAbove(path[2]!);
  await drawMap.panel.expectUndoDisabled();
  await drawMap.modes.expectLineActive();
  await drawMap.modes.expectBreakDisabled();
  await drawMap.events.expectCount("mdl:modechanged", 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line" });
});

test("a closed line from the initial option is drawn closed and can be split", async ({ drawMap }) => {
  await drawMap.open({
    options: { initial: { geometry: "line", closeGeometry: true, generateId: true, steps: closed(OPEN_STEPS) } },
  });

  expect(await drawMap.drawing.stepCoordinates()).toEqual(OPEN_STEPS.map((step) => [step.lng, step.lat]));
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectClosed();
  await drawMap.modes.expectLineActive();
  await drawMap.modes.expectBreakEnabled();
  await drawMap.modes.expectPolygonDisabled();
  await drawMap.enterBreakMode();
});

test("a closed polygon from the initial option shows its fill", async ({ drawMap }) => {
  await drawMap.open({
    options: { initial: { geometry: "polygon", closeGeometry: true, generateId: true, steps: closed(OPEN_STEPS) } },
  });
  const path = await Promise.all(closed(OPEN_STEPS).map((step) => drawMap.drawing.pixelOf(step)));
  const inside = drawMap.layout.centroid(path.slice(0, 3));

  expect(await drawMap.drawing.stepCoordinates()).toEqual(OPEN_STEPS.map((step) => [step.lng, step.lat]));
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectPolygonPainted(inside, true);
  await drawMap.modes.expectPolygonActive();
  await drawMap.modes.expectBreakEnabled();
  await drawMap.modes.expectLineDisabled();
});

test("a line as the initial geometry wins over polygon as the initial mode", async ({ drawMap }) => {
  await drawMap.open({
    options: {
      modes: { initial: "polygon" },
      initial: { geometry: "line", closeGeometry: false, generateId: true, steps: OPEN_STEPS },
    },
  });

  await drawMap.modes.expectLineActive();
  await drawMap.events.expectCount("mdl:modechanged", 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line" });
});

test("a polygon as the initial geometry wins over line as the initial mode", async ({ drawMap }) => {
  await drawMap.open({
    options: {
      modes: { initial: "line" },
      initial: { geometry: "polygon", closeGeometry: true, generateId: true, steps: closed(OPEN_STEPS) },
    },
  });

  await drawMap.modes.expectPolygonActive();
  await drawMap.events.expectCount("mdl:modechanged", 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "polygon" });
});

test("a polygon from the initial option may start open, and the user closes it with a click on the first point", async ({
  drawMap,
}) => {
  await drawMap.open({
    options: { initial: { geometry: "polygon", closeGeometry: false, generateId: true, steps: OPEN_STEPS } },
  });
  const path = await Promise.all(OPEN_STEPS.map((step) => drawMap.drawing.pixelOf(step)));
  const inside = drawMap.layout.centroid(path);

  await drawMap.modes.expectPolygonActive();
  await drawMap.drawing.expectOpen();
  await drawMap.drawing.expectPolygonPainted(inside, false);

  await drawMap.parkPointer();
  await drawMap.closeByClickingFirst(path[0]!);

  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectPolygonPainted(inside, true);
});

test("generated ids are given to every step from the initial option", async ({ drawMap }) => {
  await drawMap.open({
    options: { initial: { geometry: "line", closeGeometry: false, generateId: true, steps: OPEN_STEPS } },
  });

  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(3);
  for (const id of ids) expect(typeof id).toBe("string");
});

test("invalid initial steps are refused when the control is added, and a valid control still mounts after", async ({
  drawMap,
}) => {
  await drawMap.open({ mount: false });

  await expect(
    drawMap.api.mount({ initial: { geometry: "line", closeGeometry: false, generateId: true, steps: [] } }),
  ).rejects.toThrow(ERRORS.empty);
  await expect(
    drawMap.api.mount({
      // приведение типа позволяет передать шаги без id, это и есть проверяемый неверный ввод
      initial: { geometry: "line", closeGeometry: false, generateId: false, steps: OPEN_STEPS as Step[] },
    }),
  ).rejects.toThrow(ERRORS.missingIds);
  await expect(
    drawMap.api.mount({
      initial: { geometry: "line", closeGeometry: true, generateId: true, steps: OPEN_STEPS.slice(0, 2) },
    }),
  ).rejects.toThrow(ERRORS.notEnough);
  await expect(
    drawMap.api.mount({
      initial: { geometry: "line", closeGeometry: true, generateId: true, steps: [...OPEN_STEPS, FOURTH_STEP] },
    }),
  ).rejects.toThrow(ERRORS.notClosed);
  await drawMap.canvas.settle();
  expect(await drawMap.mapErrors()).toEqual([]);

  await drawMap.api.mount({ modes: { initial: "line" } });

  await drawMap.modes.expectLineActive();
  await drawMap.drawPoint(drawMap.layout.line.first);
  await drawMap.events.expectLastTotal("mdl:add", 1);
});

test("ids given with the steps are kept when id generation is on", async ({ drawMap }) => {
  await drawMap.open({
    options: { initial: { geometry: "line", closeGeometry: false, generateId: true, steps: OWN_STEPS } },
  });

  await drawMap.drawing.expectStepOrder(["own-0", "own-1", "own-2"]);
  expect(await drawMap.drawing.stepCoordinates()).toEqual(OWN_STEPS.map((step) => [step.lng, step.lat]));
});

test("steps with their own ids and generation off are all drawn and can be hovered, dragged and removed", async ({
  drawMap,
}) => {
  await drawMap.open({
    options: { initial: { geometry: "line", closeGeometry: false, generateId: false, steps: OWN_STEPS } },
  });
  const path = await Promise.all(OWN_STEPS.map((step) => drawMap.drawing.pixelOf(step)));

  await drawMap.drawing.expectStepOrder(["own-0", "own-1", "own-2"]);
  expect(await drawMap.drawing.stepCoordinates()).toEqual(OWN_STEPS.map((step) => [step.lng, step.lat]));
  await drawMap.drawing.expectPointCount(3);

  await drawMap.parkPointer();
  await drawMap.hoverPoint(path[1]!);

  await drawMap.events.expectCount("mdl:pointenter", 1);
  await drawMap.events.expectLastId("mdl:pointenter", "own-1");

  const dropped = drawMap.layout.offsetFrom(path[1]!, 40, 60);
  await drawMap.dragPoint(path[1]!, dropped);
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.events.expectLastId("mdl:moveend", "own-1");

  await drawMap.parkPointer();
  await drawMap.hoverPoint(dropped);
  await drawMap.removePointUnderPointer();
  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.events.expectLastId("mdl:pointremove", "own-1");
  await drawMap.drawing.expectStepOrder(["own-0", "own-2"]);
});

test("a closed shape from the initial option needs three different points", async ({ drawMap }) => {
  await drawMap.open({ mount: false });
  const [a, b] = OPEN_STEPS;

  await expect(
    drawMap.api.mount({ initial: { geometry: "line", closeGeometry: true, generateId: true, steps: [a!, b!, a!] } }),
  ).rejects.toThrow(ERRORS.notEnough);
  await expect(
    drawMap.api.mount({
      initial: { geometry: "line", closeGeometry: true, generateId: true, steps: [a!, b!, b!, a!] },
    }),
  ).rejects.toThrow(ERRORS.notEnough);
  await expect(
    drawMap.api.mount({ initial: { geometry: "line", closeGeometry: true, generateId: true, steps: OPEN_STEPS } }),
  ).rejects.toThrow(ERRORS.notClosed);
});

test("with id generation on, only the steps without an id get a new one", async ({ drawMap }) => {
  const steps = [{ ...OPEN_STEPS[0]!, id: "own-0" }, OPEN_STEPS[1]!, { ...OPEN_STEPS[2]!, id: "own-2" }];
  await drawMap.open({
    // тип не разрешает смешивать шаги с id и без, а библиотека такие принимает
    options: { initial: { geometry: "line", closeGeometry: false, generateId: true, steps: steps as Step[] } },
  });

  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  expect(ids).toHaveLength(3);
  expect(ids[0]).toBe("own-0");
  expect(ids[2]).toBe("own-2");
  expect(typeof ids[1]).toBe("string");
  expect(["own-0", "own-2", ""]).not.toContain(ids[1]);
});
