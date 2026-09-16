import { expect, test } from "./fixtures";

const ALREADY_ADDED = "DrawLibre is already added to a map";
const REENTRANT = "DrawLibre is in the middle of being added or removed";

test("a second control on the same map is refused", async ({ drawMap }) => {
  await drawMap.open();

  expect(await drawMap.api.lifecycle.secondControlOnSameMap()).toContain(ALREADY_ADDED);
  await drawMap.modes.expectLineActive();
});

test("a second control on another map is refused, the limit is per module not per map", async ({ drawMap }) => {
  await drawMap.open();

  expect(await drawMap.api.lifecycle.secondControlOnOtherMap()).toContain(ALREADY_ADDED);
});

test("adding the same control twice without removing it is refused", async ({ drawMap }) => {
  await drawMap.open();

  expect(await drawMap.api.lifecycle.sameControlTwice()).toContain(ALREADY_ADDED);
});

test("a listener adding a second control during the mount is refused", async ({ drawMap }) => {
  await drawMap.open({ mount: false });

  expect(await drawMap.api.lifecycle.addFromModeChanged()).toContain(REENTRANT);
});

test("a listener removing the control during the mount is refused", async ({ drawMap }) => {
  await drawMap.open({ mount: false });

  expect(await drawMap.api.lifecycle.removeFromModeChanged()).toContain(REENTRANT);
});

test("a listener that throws during the mount leaves the map as it was and does not wedge the guard", async ({
  drawMap,
}) => {
  await drawMap.open({ mount: false });
  await drawMap.modes.line.waitFor({ state: "detached" });
  const before = await drawMap.drawing.mapStyleFootprint();

  expect(await drawMap.api.lifecycle.throwFromModeChanged()).toContain("listener failure");
  expect(await drawMap.drawing.mapStyleFootprint()).toEqual(before);

  await drawMap.api.mount({ modes: { initial: "line" } });
  await drawMap.modes.expectLineActive();
});

test("onRemove on a control that was never added leaves the mounted one alone", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.undo();
  await drawMap.panel.expectRedoEnabled();

  await drawMap.api.lifecycle.removeForeignControl();

  await drawMap.drawing.expectPointCount(2);
  await drawMap.panel.expectRedoEnabled();
  await drawMap.panel.expectUndoEnabled();
  await drawMap.drawPoint(line.last);
  await drawMap.drawing.expectPointCount(3);
});

test("the control can be added again after it was removed", async ({ drawMap }) => {
  await drawMap.open();
  await drawMap.api.unmount();
  await drawMap.modes.line.waitFor({ state: "detached" });

  await drawMap.api.remount();

  await drawMap.modes.expectLineActive();
});
