import { test } from "./fixtures";

test("undo without an argument undoes and reports the call without an original event", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);

  await drawMap.api.undoWithoutEvent();

  await drawMap.events.expectCount("mdl:undo", 1);
  await drawMap.events.expectLastPayload("mdl:undo", { total: 1, hasOriginalEvent: false });
  await drawMap.drawing.expectPointCount(1);
});

test("redo without an argument redoes and reports the call without an original event", async ({ drawMap }) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.api.undoWithoutEvent();

  await drawMap.api.redoWithoutEvent();

  await drawMap.events.expectCount("mdl:redo", 1);
  await drawMap.events.expectLastPayload("mdl:redo", { total: 2, hasOriginalEvent: false });
  await drawMap.drawing.expectPointCount(2);
});
