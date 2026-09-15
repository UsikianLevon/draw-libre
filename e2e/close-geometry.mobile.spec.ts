import { test } from "./fixtures";

test("tapping the first of three points closes the line", async ({ drawMap }) => {
  const line = await drawMap.openWithLineByTap();

  await drawMap.closeByTappingFirst(line.first);

  await drawMap.events.expectUnchanged("mdl:add", 3);
});
