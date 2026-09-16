import { expect, test } from "./fixtures";

const NOT_ADDED = "DrawLibre is not added to a map";

const STATE_METHODS = [
  "setSteps",
  "getAllSteps",
  "findStepById",
  "findNodeById",
  "undo",
  "redo",
  "clear",
  "save",
  "removeAllSteps",
];

test("every state method refuses to work before the control is added to a map", async ({ drawMap }) => {
  await drawMap.open({ mount: false });

  for (const method of STATE_METHODS) {
    expect(await drawMap.api.lifecycle.callBeforeMount(method), method).toContain(NOT_ADDED);
  }
});

test("subscribing before the control is added keeps working", async ({ drawMap }) => {
  await drawMap.open({ mount: false });
  const listener = await drawMap.api.probe.on("mdl:add");

  await drawMap.api.remount();
  await drawMap.drawPoint(drawMap.layout.line.first);

  expect(await drawMap.api.probe.count(listener)).toBe(1);
});
