import { test, expect } from "./fixtures";

const OFFSET_PX = 6;

test("the ghost point snaps onto the line when the cursor is beside it", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const beside = { x: Math.round((line.first.x + line.middle.x) / 2), y: line.first.y + OFFSET_PX };

  await drawMap.hoverPoint(beside);

  await drawMap.drawing.expectGhostOnSegment(beside, line.first, line.middle);
});

test("the ghost point gives way to a vertex", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();

  await drawMap.hoverPoint({ x: line.middle.x - 40, y: line.middle.y });
  await drawMap.drawing.expectGhostVisible();

  await drawMap.hoverPoint({ x: line.middle.x - 9, y: line.middle.y });

  await drawMap.drawing.expectGhostHidden();
});

test("a fast flick off the line still hides the ghost point", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();
  const onLine = { x: Math.round((line.first.x + line.middle.x) / 2), y: line.first.y };
  await drawMap.hoverPoint(onLine);
  await drawMap.drawing.expectGhostStillVisible();

  await drawMap.canvas.moveWithinOneTask([{ x: onLine.x + 3, y: onLine.y }, drawMap.layout.emptySpot]);

  await drawMap.drawing.expectGhostHidden();
});

test("removing the control while the ghost point is hiding reports no map errors", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();
  await drawMap.hoverPoint({ x: Math.round((line.first.x + line.middle.x) / 2), y: line.first.y });
  await drawMap.drawing.expectGhostStillVisible();

  const errors = await drawMap.removeControlRightAfterMovingTo(drawMap.layout.emptySpot);

  expect(errors).toEqual([]);
});

test("a click beside the line inserts the point onto the line", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const beside = { x: Math.round((line.first.x + line.middle.x) / 2), y: line.first.y + OFFSET_PX };

  const before = await drawMap.events.count("mdl:add");
  await drawMap.canvas.click(beside);
  await drawMap.events.expectCount("mdl:add", before + 1);

  await expect
    .poll(async () => {
      const inserted = await drawMap.drawing.pointNear(beside);
      return inserted ? Math.abs(inserted.y - line.first.y) : Number.POSITIVE_INFINITY;
    })
    .toBeLessThanOrEqual(1);
});

test("a point is grabbed from farther than it is drawn", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();

  await drawMap.hoverPoint({ x: line.middle.x + 10, y: line.middle.y });

  await drawMap.removeButton.expectVisible();
});

test("the first point keeps the same grab area as the rest", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();

  const before = await drawMap.events.count("mdl:pointenter");
  await drawMap.hoverPoint({ x: line.first.x + 10, y: line.first.y });

  await drawMap.events.expectCount("mdl:pointenter", before + 1);
});

test("a click beside the closing segment inserts between the ends", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const idles = await drawMap.canvas.idleCount();
  await drawMap.canvas.click(line.first);
  await drawMap.canvas.waitUntilRepainted(idles);
  await drawMap.parkPointer();

  const along = { x: line.first.x - line.last.x, y: line.first.y - line.last.y };
  const length = Math.hypot(along.x, along.y);
  const normal = { x: -along.y / length, y: along.x / length };
  const midpoint = { x: (line.first.x + line.last.x) / 2, y: (line.first.y + line.last.y) / 2 };
  const beside = {
    x: Math.round(midpoint.x + normal.x * OFFSET_PX),
    y: Math.round(midpoint.y + normal.y * OFFSET_PX),
  };

  await drawMap.canvas.click(beside);

  await expect
    .poll(async () => {
      const inserted = await drawMap.drawing.pointNear(beside);
      if (!inserted) return Number.POSITIVE_INFINITY;

      const t = ((inserted.x - line.last.x) * along.x + (inserted.y - line.last.y) * along.y) / (length * length);
      const closest = { x: line.last.x + along.x * t, y: line.last.y + along.y * t };
      return Math.round(Math.hypot(inserted.x - closest.x, inserted.y - closest.y));
    })
    .toBeLessThanOrEqual(1);
});

test("undo after grabbing by the edge of the grab area restores the exact vertex", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const grabbedOffCentre = { x: line.middle.x - 10, y: line.middle.y };

  await drawMap.dragPoint(grabbedOffCentre, { x: line.middle.x + 90, y: line.middle.y + 90 });
  await drawMap.panel.clickUndo();

  await expect
    .poll(async () => {
      const restored = await drawMap.drawing.pointNear(line.middle);
      return restored
        ? Math.round(Math.hypot(restored.x - line.middle.x, restored.y - line.middle.y))
        : Number.POSITIVE_INFINITY;
    })
    .toBeLessThanOrEqual(1);
});

test("the magnet works on a repeated world copy instead of corrupting the geometry", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.canvas.shiftWorldCopies(1);

  const before = await drawMap.drawing.stepCoordinates();
  const beside = { x: Math.round((line.first.x + line.middle.x) / 2), y: line.first.y + OFFSET_PX };
  await drawMap.canvas.click(beside);

  await drawMap.drawing.expectPointCount(before.length + 1);
  expect(await drawMap.drawing.duplicateStepCount()).toBe(0);

  const after = await drawMap.drawing.stepCoordinates();
  const inserted = after.find((point) => !before.some(([lng, lat]) => lng === point[0] && lat === point[1]));
  expect(inserted).toBeDefined();

  const [firstLng, firstLat] = before[0]!;
  const [middleLng] = before[1]!;
  expect(Math.abs(inserted![1] - firstLat)).toBeLessThan(1e-6);
  expect(inserted![0]).toBeGreaterThan(firstLng);
  expect(inserted![0]).toBeLessThan(middleLng);
});

test("the magnet keeps working on a rotated world copy", async ({ drawMap }) => {
  await drawMap.openWithLine();
  await drawMap.canvas.jumpTo({ center: [360, 0], bearing: 30 });

  const [first, middle] = await drawMap.drawing.stepPixelsOnCopy(1);
  const onSegment = { x: Math.round((first!.x + middle!.x) / 2), y: Math.round((first!.y + middle!.y) / 2) };

  await drawMap.parkPointer();
  await drawMap.hoverPoint(onSegment);

  await drawMap.drawing.expectGhostRenderedAt(onSegment);
});
