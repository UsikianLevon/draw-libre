import { test } from "./fixtures";

test("the drawing layers raise no deprecated filter warning when the control mounts and the mode changes", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { modes: { initial: "line", line: { visible: true, closeGeometry: false } } } });
  await drawMap.modes.expectLineActive();

  await drawMap.modes.choosePolygon();
  await drawMap.modes.expectPolygonActive();

  await drawMap.expectNoDeprecatedFilterWarnings();
});
