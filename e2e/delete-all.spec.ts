import { test, expect } from "./fixtures";

test("delete all empties the map, hides the panel and turns both history buttons off", async ({ drawMap }) => {
  await drawMap.openWithLine();
  await drawMap.undo();
  await drawMap.panel.expectRedoEnabled();
  const redoEvents = await drawMap.events.count("mdl:redostackchanged");

  await drawMap.deleteAll();

  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectHidden();
  await drawMap.panel.expectUndoDisabled();
  await drawMap.panel.expectRedoDisabled();
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 0 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
  await drawMap.events.expectCount("mdl:redostackchanged", redoEvents + 1);
});

test("clear through the API empties the map the same way and reports it without an original event", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();
  await drawMap.undo();
  await drawMap.panel.expectRedoEnabled();

  await drawMap.api.clear();

  await drawMap.events.expectCount("mdl:removeall", 1);
  await drawMap.events.expectLastPayload("mdl:removeall", { hasOriginalEvent: false });
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectHidden();
  await drawMap.panel.expectUndoDisabled();
  await drawMap.panel.expectRedoDisabled();
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 0 });
  await drawMap.modes.expectLineActive();
  await drawMap.events.expectUnchanged("mdl:modechanged", 1);
  await drawMap.drawPoint(line.first);
  expect((await drawMap.events.lastPayload("mdl:add")).total).toBe(1);
});

test("with only the history buttons shown, clear through the API still hides the panel", async ({ drawMap }) => {
  await drawMap.openWithLine({
    options: { panel: { buttons: { save: { visible: false }, delete: { visible: false } } } },
  });

  await drawMap.api.clear();

  await drawMap.events.expectCount("mdl:removeall", 1);
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectHidden();
});

test("delete all keeps the mode without announcing it again, and the next click starts a new drawing", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine();

  await drawMap.deleteAll();

  await drawMap.modes.expectLineActive();
  await drawMap.events.expectUnchanged("mdl:modechanged", 1);
  await drawMap.drawPoint(line.first);
  expect((await drawMap.events.lastPayload("mdl:add")).total).toBe(1);
});

test("delete all on a closed shape resets the closing and disables break", async ({ drawMap }) => {
  await drawMap.open();
  const triangle = await drawMap.drawClosedTriangle();

  await drawMap.deleteAll();

  await drawMap.modes.expectBreakDisabled();
  await drawMap.drawPoint(triangle.a);
  expect((await drawMap.events.lastPayload("mdl:add")).mode).toEqual({ geometry: "line", closedGeometry: false });
});

test("delete all in break mode leaves break mode with one mode change", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  const announced = await drawMap.events.count("mdl:modechanged");

  await drawMap.deleteAll();

  await drawMap.events.expectCount("mdl:modechanged", announced + 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line" });
  await drawMap.events.expectUnchanged("mdl:modechanged", announced + 1);
  await drawMap.modes.expectBreakInactive();
  await drawMap.modes.expectLineActive();
});

test("the delete button is absent when it is hidden in the options", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: { panel: { buttons: { delete: { visible: false } } } } });

  await drawMap.panel.expectVisible();
  await drawMap.panel.expectNoButton("delete");
});
