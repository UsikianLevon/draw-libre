import { test, expect } from "./fixtures";

test("clicking the button of the current mode leaves break mode for that mode", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  const announced = await drawMap.events.count("mdl:modechanged");

  await drawMap.modes.chooseLine();

  await drawMap.modes.expectLineActive();
  await drawMap.modes.expectBreakInactive();
  await drawMap.events.expectCount("mdl:modechanged", announced + 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line" });
  await drawMap.events.expectUnchanged("mdl:modechanged", announced + 1);
  await drawMap.modes.expectPolygonDisabled();
});

test("in polygon mode clicking the polygon button leaves break mode for polygon mode", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: "polygon" } } });
  await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  const announced = await drawMap.events.count("mdl:modechanged");

  await drawMap.modes.choosePolygon();

  await drawMap.modes.expectPolygonActive();
  await drawMap.modes.expectBreakInactive();
  await drawMap.events.expectCount("mdl:modechanged", announced + 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "polygon" });
  await drawMap.events.expectUnchanged("mdl:modechanged", announced + 1);
  await drawMap.modes.expectLineDisabled();
});

test("break stays disabled while the line is open", async ({ drawMap }) => {
  await drawMap.openWithLine();

  await drawMap.modes.expectBreakDisabled();
});

test("a closed shape enables break, and choosing it announces break mode", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.drawClosedTriangle();
  await drawMap.modes.expectBreakEnabled();

  await drawMap.modes.chooseBreak();

  await drawMap.modes.expectBreakActive();
  await drawMap.events.expectCount("mdl:modechanged", 2);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "break" });
});

test("in break mode hovering a segment highlights exactly that segment until the pointer leaves", async ({
  drawMap,
}) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();

  await drawMap.hoverSegment(triangle.b, triangle.c);

  await drawMap.drawing.expectBreakSegment(triangle.b, triangle.c);

  await drawMap.parkPointer();

  await drawMap.drawing.expectNoBreakSegment();
});

test("a click on a segment opens the shape there and returns to the previous mode", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  const [a, b, c] = (await drawMap.drawing.steps()).map((step) => step.id);
  await drawMap.enterBreakMode();

  await drawMap.breakAt(triangle.b, triangle.c);

  await drawMap.drawing.expectOpen();
  await drawMap.drawing.expectStepOrder([c!, a!, b!]);
  expect(await drawMap.events.lastPayload("mdl:break")).toEqual({ type: "mdl:break", hasOriginalEvent: false });
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line" });
  await drawMap.modes.expectBreakInactive();
  await drawMap.modes.expectLineActive();
});

test("breaking a filled shape removes the fill and returns to polygon mode", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: "polygon" } } });
  const triangle = await drawMap.drawClosedTriangle();
  const inside = drawMap.layout.centroid([triangle.a, triangle.b, triangle.c]);
  await drawMap.drawing.expectPolygonPainted(inside, true);
  await drawMap.enterBreakMode();

  await drawMap.breakAt(triangle.b, triangle.c);

  await drawMap.drawing.expectPolygonPainted(inside, false);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "polygon" });
  await drawMap.modes.expectPolygonActive();
});

test("after a break the dynamic line hangs off the new end of the line", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  await drawMap.breakAt(triangle.b, triangle.c);

  const spot = drawMap.layout.emptySpot;
  await drawMap.canvas.hover(spot);

  await drawMap.drawing.expectDynamicLineEndAt(spot);
  await drawMap.drawing.expectDynamicLineFrom(triangle.b);
});

test("undo closes a broken shape in its old order and redo breaks it again", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  const [a, b, c] = (await drawMap.drawing.steps()).map((step) => step.id);
  await drawMap.enterBreakMode();
  await drawMap.breakAt(triangle.b, triangle.c);

  await drawMap.undo();

  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectStepOrder([a!, b!, c!]);

  await drawMap.redo();

  await drawMap.drawing.expectOpen();
  await drawMap.drawing.expectStepOrder([c!, a!, b!]);
});

test("in auto mode a break removes only the midpoint of the broken segment", async ({ drawMap }) => {
  await drawMap.open({ options: { pointGeneration: "auto" } });
  const triangle = await drawMap.drawClosedTriangle();
  const midpoints = (await drawMap.drawing.points()).filter((point) => point.auxiliary);
  const onBroken = drawMap.layout.segmentMidpoint(triangle.b, triangle.c);
  const broken = midpoints.reduce((nearest, point) =>
    Math.hypot(point.px.x - onBroken.x, point.px.y - onBroken.y) <
    Math.hypot(nearest.px.x - onBroken.x, nearest.px.y - onBroken.y)
      ? point
      : nearest,
  );
  await drawMap.enterBreakMode();

  // сгенерированная середина лежит посередине сегмента, клик туда захватывает её вместо разрыва
  await drawMap.breakAt(triangle.b, triangle.c, 0.25);

  await drawMap.drawing.expectPrimaryCount(3);
  await drawMap.drawing.expectAuxiliaryCount(2);
  const kept = (await drawMap.drawing.points()).filter((point) => point.auxiliary).map((point) => point.id);
  expect(kept.sort()).toEqual(
    midpoints
      .filter((point) => point.id !== broken.id)
      .map((point) => point.id)
      .sort(),
  );
  for (const point of (await drawMap.drawing.points()).filter((candidate) => candidate.auxiliary)) {
    const before = midpoints.find((candidate) => candidate.id === point.id)!;
    expect(Math.hypot(point.px.x - before.px.x, point.px.y - before.px.y)).toBeLessThanOrEqual(1);
  }
});

test("dragging a point in break mode clears the highlight and does not break the shape", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  await drawMap.enterBreakMode();
  await drawMap.hoverSegment(triangle.b, triangle.c);

  await drawMap.canvas.press(triangle.b);
  await drawMap.drawing.expectNoBreakSegment();
  await drawMap.canvas.dragTo(drawMap.layout.offsetFrom(triangle.b, 60, -60));
  await drawMap.canvas.release();

  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.events.expectNever("mdl:break");
  await drawMap.drawing.expectClosed();
  await drawMap.drawing.expectStepOrder(ids);
  await drawMap.modes.expectBreakActive();
});

test("a click on the empty map in break mode changes nothing and break mode stays on", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.drawClosedTriangle();
  const ids = (await drawMap.drawing.steps()).map((step) => step.id);
  await drawMap.enterBreakMode();
  const snapshot = await drawMap.snapshot();

  await drawMap.canvas.click(drawMap.layout.emptySpot);

  await drawMap.expectNothingHappenedSince(snapshot);
  await drawMap.modes.expectBreakActive();
  await drawMap.drawing.expectStepOrder(ids);
  await drawMap.drawing.expectClosed();
});

test("breaking again after undoing a break opens the shape without adding a point", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  const [a, b, c] = (await drawMap.drawing.steps()).map((step) => step.id);
  await drawMap.enterBreakMode();
  await drawMap.breakAt(triangle.b, triangle.c);
  await drawMap.undo();
  await drawMap.drawing.expectClosed();

  await drawMap.enterBreakMode();
  await drawMap.breakAt(triangle.a, triangle.b);

  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.drawing.expectOpen();
  await drawMap.drawing.expectStepOrder([b!, c!, a!]);
});

test("after a break, a click on the line with the drawing mode switched off adds nothing", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  await drawMap.breakAt(triangle.b, triangle.c);
  await drawMap.modes.chooseLine();
  await drawMap.modes.expectNoneActive();

  await drawMap.canvas.click(drawMap.layout.alongSegment(triangle.a, triangle.b, 0.4));

  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.drawing.expectPointCount(3);
});

test("after a break made with the drawing mode switched off, a click on the line adds nothing", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  await drawMap.breakAt(triangle.b, triangle.c);
  await drawMap.modes.chooseLine();
  await drawMap.modes.expectNoneActive();

  // при выключенном режиме рисования панель скрыта, её кнопка undo недоступна
  await drawMap.api.undo();
  await drawMap.events.expectCount("mdl:undo", 1);
  await drawMap.drawing.expectClosed();
  await drawMap.enterBreakMode();
  await drawMap.breakAt(triangle.a, triangle.b);

  await drawMap.canvas.click(drawMap.layout.alongSegment(triangle.b, triangle.c, 0.4));

  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.drawing.expectPointCount(3);
});

test("in break mode the button of the other drawing mode is disabled and a click on it changes nothing", async ({
  drawMap,
}) => {
  await drawMap.open();
  await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  await drawMap.modes.expectPolygonDisabled();
  const snapshot = await drawMap.snapshot();

  await drawMap.modes.forceClick("polygon");

  await drawMap.expectNothingHappenedSince(snapshot);
  await drawMap.modes.expectBreakActive();
  await drawMap.modes.expectPolygonInactive();
  await drawMap.modes.expectPolygonDisabled();
});
