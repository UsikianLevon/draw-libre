import { test, expect } from "./fixtures";

const KEEP_ON_SAVE = { panel: { buttons: { save: { clearOnSave: false } } } };

test("save through the API fires the save event without an original event", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: KEEP_ON_SAVE });
  const steps = await drawMap.drawing.steps();

  await drawMap.api.save();

  await drawMap.events.expectCount("mdl:save", 1);
  const saved = await drawMap.events.lastPayload("mdl:save");
  expect(saved).toMatchObject({ hasOriginalEvent: false, mode: { geometry: "line", closedGeometry: false } });
  expect(saved.steps).toEqual(steps);
  await drawMap.drawing.expectPointCount(3);
});

test("saving an open line reports its steps in drawing order and its mode", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: KEEP_ON_SAVE });
  const steps = await drawMap.drawing.steps();

  await drawMap.save();

  const saved = await drawMap.events.lastPayload("mdl:save");
  expect(saved).toMatchObject({ hasOriginalEvent: true, mode: { geometry: "line", closedGeometry: false } });
  expect(saved.steps).toEqual(steps);
});

test("saving a closed polygon reports it as closed", async ({ drawMap }) => {
  await drawMap.open({ options: { ...KEEP_ON_SAVE, modes: { initial: "polygon" } } });
  await drawMap.drawClosedTriangle();

  await drawMap.save();

  expect((await drawMap.events.lastPayload("mdl:save")).mode).toEqual({ geometry: "polygon", closedGeometry: true });
});

test("with clearing on save the map empties and the history resets, without a mode change", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: { panel: { buttons: { save: { clearOnSave: true } } } } });
  await drawMap.undo();
  await drawMap.panel.expectRedoEnabled();
  const steps = await drawMap.drawing.steps();
  expect(steps).toHaveLength(2);

  await drawMap.save();

  const saved = await drawMap.events.lastPayload("mdl:save");
  expect(saved.mode).toEqual({ geometry: "line", closedGeometry: false });
  expect(saved.steps).toEqual(steps);
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectHidden();
  await drawMap.panel.expectUndoDisabled();
  await drawMap.panel.expectRedoDisabled();
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 0 });
  await drawMap.events.expectLastPayload("mdl:redostackchanged", { length: 0 });
  await drawMap.events.expectCount("mdl:removeall", 1);
  await drawMap.events.expectUnchanged("mdl:modechanged", 1);
});

test("without clearing on save the drawing and its history stay", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: KEEP_ON_SAVE });

  await drawMap.save();

  await drawMap.drawing.expectPointCount(3);
  await drawMap.panel.expectUndoEnabled();
  await drawMap.events.expectNever("mdl:removeall");
});

test("save through the API with clearing reports both the save and the clearing without an original event", async ({
  drawMap,
}) => {
  await drawMap.openWithLine({ options: { panel: { buttons: { save: { clearOnSave: true } } } } });
  const steps = await drawMap.drawing.steps();

  await drawMap.api.save();

  await drawMap.events.expectCount("mdl:save", 1);
  await drawMap.events.expectCount("mdl:removeall", 1);
  await drawMap.events.expectLastPayload("mdl:save", { hasOriginalEvent: false });
  await drawMap.events.expectLastPayload("mdl:removeall", { hasOriginalEvent: false });
  const saved = await drawMap.events.lastPayload("mdl:save");
  expect(saved.mode).toEqual({ geometry: "line", closedGeometry: false });
  expect(saved.steps).toEqual(steps);
  await drawMap.drawing.expectEmpty();
});

test("save through the API with clearing reports a closed polygon with its steps, then empties the map", async ({
  drawMap,
}) => {
  await drawMap.open({
    options: { panel: { buttons: { save: { clearOnSave: true } } }, modes: { initial: "polygon" } },
  });
  await drawMap.drawClosedTriangle();
  const steps = await drawMap.drawing.steps();
  expect(steps).toHaveLength(3);

  await drawMap.api.save();

  await drawMap.events.expectCount("mdl:save", 1);
  const saved = await drawMap.events.lastPayload("mdl:save");
  expect(saved.mode).toEqual({ geometry: "polygon", closedGeometry: true });
  expect(saved.steps).toEqual(steps);
  await drawMap.drawing.expectEmpty();
});

test("the save button is absent when it is hidden in the options", async ({ drawMap }) => {
  await drawMap.openWithLine({ options: { panel: { buttons: { save: { visible: false } } } } });

  await drawMap.panel.expectVisible();
  await drawMap.panel.expectNoButton("save");
});

test("save with clearing in break mode leaves break mode with one mode change", async ({ drawMap }) => {
  await drawMap.open({ options: { panel: { buttons: { save: { visible: true, clearOnSave: true } } } } });
  await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();
  const snapshot = await drawMap.snapshot();

  await drawMap.api.save();

  await drawMap.events.expectCount("mdl:save", snapshot.events["mdl:save"] + 1);
  await drawMap.drawing.expectEmpty();
  await drawMap.events.expectCount("mdl:modechanged", snapshot.events["mdl:modechanged"] + 1);
  await drawMap.events.expectLastPayload("mdl:modechanged", { mode: "line" });
  await drawMap.events.expectUnchanged("mdl:modechanged", snapshot.events["mdl:modechanged"] + 1);
  await drawMap.modes.expectBreakInactive();
  await drawMap.modes.expectLineActive();
});
