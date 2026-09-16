import { expect, test } from "./fixtures";

test("a listener added with draw.on hears every added point until it unsubscribes", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  const listener = await drawMap.api.probe.on("mdl:add");

  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  expect(await drawMap.api.probe.count(listener)).toBe(2);

  await drawMap.api.probe.unsubscribe(listener);
  await drawMap.api.probe.unsubscribe(listener);
  await drawMap.drawPoint(line.last);

  expect(await drawMap.api.probe.count(listener)).toBe(2);
});

test("a listener added with draw.once hears only the first event", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  const listener = await drawMap.api.probe.once("mdl:add");

  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);

  expect(await drawMap.api.probe.count(listener)).toBe(1);
});

test("draw.off removes listeners added with on and with once", async ({ drawMap }) => {
  await drawMap.open();
  const regular = await drawMap.api.probe.on("mdl:add");
  const single = await drawMap.api.probe.once("mdl:add");

  await drawMap.api.probe.off(regular);
  await drawMap.api.probe.off(single);
  await drawMap.drawPoint(drawMap.layout.line.first);

  expect(await drawMap.api.probe.count(regular)).toBe(0);
  expect(await drawMap.api.probe.count(single)).toBe(0);
});

test("a listener added before the control is mounted keeps hearing after the control is removed and added again", async ({
  drawMap,
}) => {
  await drawMap.open({ mount: false });
  const line = drawMap.layout.line;
  const listener = await drawMap.api.probe.on("mdl:add");

  await drawMap.api.remount();
  await drawMap.modes.expectLineActive();
  await drawMap.drawPoint(line.first);
  expect(await drawMap.api.probe.count(listener)).toBe(1);

  await drawMap.api.unmount();
  await drawMap.api.remount();
  await drawMap.modes.expectLineActive();
  await drawMap.drawPoint(line.middle);

  expect(await drawMap.api.probe.count(listener)).toBe(2);
});

const SAVE_WITHOUT_CLEAR = { panel: { buttons: { save: { visible: true, clearOnSave: false } } } };

test("an event still reaches the instance when a map listener removes the control", async ({ drawMap }) => {
  await drawMap.open({ options: SAVE_WITHOUT_CLEAR });
  await drawMap.drawPoint(drawMap.layout.line.first);

  expect(await drawMap.api.reentrancy.removeControlOnSave()).toEqual({ map: 1, draw: 1 });
});

test("both channels see a nested event in the same order", async ({ drawMap }) => {
  await drawMap.open({ options: SAVE_WITHOUT_CLEAR });
  await drawMap.drawPoint(drawMap.layout.line.first);

  const order = await drawMap.api.reentrancy.clearOnSave();

  expect(order.map).toEqual(["mdl:save", "mdl:removeall"]);
  expect(order.draw).toEqual(order.map);
});
