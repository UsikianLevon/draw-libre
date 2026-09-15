import { test } from "./fixtures";

test("tapping undo on the panel takes back the last point", async ({ drawMap }) => {
  const line = await drawMap.openWithLineByTap();
  const middleId = await drawMap.events.idOf("mdl:add", 1);

  await drawMap.tapUndo();

  await drawMap.events.expectLastPayload("mdl:undo", { id: middleId, total: 2, hasOriginalEvent: true });
  const undone = await drawMap.events.lastPayload("mdl:undo");
  await drawMap.drawing.expectCoordinatesAt(undone.coordinates, line.middle);
  await drawMap.drawing.expectPointCount(2);
  await drawMap.drawing.expectNoPointNear(line.last, 3);
});

test("tapping delete all on the panel empties the map", async ({ drawMap }) => {
  await drawMap.openWithLineByTap();

  await drawMap.tapDeleteAll();

  await drawMap.events.expectLastPayload("mdl:removeall", { hasOriginalEvent: true });
  await drawMap.drawing.expectEmpty();
  await drawMap.panel.expectHidden();
});
