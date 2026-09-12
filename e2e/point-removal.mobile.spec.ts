import { test } from "./fixtures";

test("tapping a point reveals the remove button", async ({ drawMap }) => {
  const line = await drawMap.openWithLineByTap();

  await drawMap.expectPointAtByTap(line.middle);
});

test("tapping the button removes the point it belongs to", async ({ drawMap }) => {
  const line = await drawMap.openWithLineByTap();
  const middleId = await drawMap.events.idOf("mdl:add", 1);

  await drawMap.tapPoint(line.middle);
  await drawMap.removeButton.expectVisible();

  await drawMap.tapRemoveButton();

  await drawMap.events.expectCount("mdl:pointremove", 1);
  await drawMap.events.expectLastId("mdl:pointremove", middleId);
  await drawMap.events.expectLastTotal("mdl:pointremove", 2);
  await drawMap.removeButton.expectHidden();
  await drawMap.expectBareMapAtByTap(line.middle);
});

test("tapping bare map dismisses the button", async ({ drawMap }) => {
  const line = await drawMap.openWithLineByTap();
  await drawMap.tapPoint(line.middle);
  await drawMap.removeButton.expectVisible();

  await drawMap.tapEmptyMap();

  await drawMap.removeButton.expectHidden();
});
