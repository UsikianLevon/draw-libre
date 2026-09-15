import { expect, test } from "./fixtures";

test("a tap on the empty map adds a point where the finger is and reports it", async ({ drawMap }) => {
  await drawMap.open();
  const at = drawMap.layout.line.first;

  await drawMap.drawPointByTap(at);

  const added = await drawMap.events.payloadOf("mdl:add", 0);
  expect(added).toMatchObject({ total: 1, mode: { geometry: "line", closedGeometry: false } });
  expect(typeof added.id).toBe("string");
  await drawMap.drawing.expectCoordinatesAt(added.coordinates, at);
  await drawMap.drawing.expectPointCount(1);
});
