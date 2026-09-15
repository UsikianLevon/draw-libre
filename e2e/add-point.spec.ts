import { test, expect } from "./fixtures";

test("a click on the empty map adds a point where the pointer is", async ({ drawMap }) => {
  await drawMap.open();
  const at = drawMap.layout.line.first;

  await drawMap.drawPoint(at);

  const added = await drawMap.events.payloadOf("mdl:add", 0);
  expect(added).toMatchObject({ total: 1, mode: { geometry: "line", closedGeometry: false } });
  expect(typeof added.id).toBe("string");
  const where = await drawMap.drawing.pixelOf(added.coordinates as { lat: number; lng: number });
  expect(Math.hypot(where.x - at.x, where.y - at.y)).toBeLessThanOrEqual(1);
  await drawMap.drawing.expectPointCount(1);
});

test("three clicks draw three points joined in the order they were placed", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  const totals: unknown[] = [];
  const ids: string[] = [];
  for (const index of [0, 1, 2]) {
    totals.push((await drawMap.events.payloadOf("mdl:add", index)).total);
    ids.push(await drawMap.events.idOf("mdl:add", index));
  }
  expect(totals).toEqual([1, 2, 3]);
  await drawMap.drawing.expectStepOrder(ids);
  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectSegmentPainted(line.first, line.middle);
  await drawMap.drawing.expectSegmentPainted(line.middle, line.last);
});

test("a double click on the empty map places one point and does not zoom", async ({ drawMap }) => {
  await drawMap.open();
  const zoom = await drawMap.canvas.zoom();

  await drawMap.canvas.dblclick(drawMap.layout.line.first);

  await drawMap.events.expectCount("mdl:add", 1);
  await drawMap.events.expectUnchanged("mdl:add", 1);
  await drawMap.drawing.expectPointCount(1);
  expect(await drawMap.canvas.zoom()).toBe(zoom);
});

test("a click on an existing point adds nothing", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  await drawMap.canvas.click(line.middle);

  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.drawing.expectPointCount(3);
});

test("a click on the last point of an open line adds nothing", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();

  await drawMap.canvas.click(line.last);

  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.events.expectLastPayload("mdl:undostackchanged", { length: 3 });
  await drawMap.drawing.expectPointCount(3);
});

test("a click inside the grab area of a point adds nothing", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();

  // кнопка удаления открывается справа от точки под указателем, клик с этой стороны может попасть в неё
  await drawMap.canvas.click(drawMap.layout.offsetFrom(line.middle, -10, 0));

  await drawMap.events.expectUnchanged("mdl:add", 3);
  await drawMap.drawing.expectPointCount(3);
});

test("with no drawing mode a click draws nothing until a mode is chosen", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: null } } });
  const at = drawMap.layout.line.first;
  const before = await drawMap.snapshot();

  await drawMap.canvas.click(at);

  await drawMap.expectNothingHappenedSince(before);

  await drawMap.modes.chooseLine();
  await drawMap.modes.expectLineActive();
  await drawMap.drawPoint(at);
  await drawMap.drawing.expectPointCount(1);
});

test("in polygon mode the first points draw a line without any fill", async ({ drawMap }) => {
  await drawMap.open({ options: { modes: { initial: "polygon" } } });

  const triangle = await drawMap.drawTriangle();

  await drawMap.drawing.expectPointCount(3);
  await drawMap.drawing.expectSegmentPainted(triangle.a, triangle.b);
  await drawMap.drawing.expectSegmentPainted(triangle.b, triangle.c);
  const inside = drawMap.layout.centroid([triangle.a, triangle.b, triangle.c]);
  await drawMap.drawing.expectPolygonPainted(inside, false);
});
