import { expect, test } from "./fixtures";

test("dragging a point with a finger moves only that point and reports where it started and landed", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLineByTap();
  const middleId = await drawMap.events.idOf("mdl:add", 1);
  const dropped = drawMap.layout.offsetFrom(line.middle, 60, 40);

  await drawMap.dragPointByTouch(line.middle, dropped);

  const moved = await drawMap.events.lastPayload("mdl:moveend");
  expect(moved).toMatchObject({ id: middleId, total: 3 });
  await drawMap.drawing.expectCoordinatesAt(moved.start_coordinates, line.middle);
  await drawMap.drawing.expectCoordinatesAt(moved.end_coordinates, dropped);
  const steps = await drawMap.drawing.steps();
  await drawMap.drawing.expectCoordinatesAt(steps[0], line.first);
  await drawMap.drawing.expectCoordinatesAt(steps[2], line.last);
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectPointNear(dropped);
});

test("after a finger drag a tap on another point still shows its remove button", async ({ drawMap }) => {
  const line = await drawMap.openWithLineByTap();
  await drawMap.dragPointByTouch(line.middle, drawMap.layout.offsetFrom(line.middle, 60, 40));

  await drawMap.tapPoint(line.last);

  await drawMap.removeButton.expectVisible();
});
