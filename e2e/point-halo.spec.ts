import { test, expect } from "./fixtures";

test("hovering a point lights up its grab area", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();

  await drawMap.hoverPoint(line.middle);

  await expect.poll(() => drawMap.hoveredPointIds()).toHaveLength(1);
});

test("the grab area goes dark once the pointer leaves", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.hoverPoint(line.middle);
  await expect.poll(() => drawMap.hoveredPointIds()).toHaveLength(1);

  await drawMap.parkPointer();

  await expect.poll(() => drawMap.hoveredPointIds()).toHaveLength(0);
});

test("sliding from one point to its neighbour lights up only the new one", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  await drawMap.parkPointer();

  await drawMap.hoverPoint(line.middle);
  await expect.poll(() => drawMap.hoveredPointIds()).toHaveLength(1);
  const [lit] = await drawMap.hoveredPointIds();

  await drawMap.hoverPoint(line.last);

  await expect
    .poll(async () => {
      const ids = await drawMap.hoveredPointIds();
      return ids.length === 1 && ids[0] !== lit;
    })
    .toBe(true);
});

test("where two grab areas overlap, the nearer point lights up", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const neighbour = { x: line.middle.x - 16, y: line.middle.y };
  await drawMap.drawPoint(neighbour);
  await drawMap.parkPointer();

  await drawMap.hoverPoint({ x: line.middle.x - 5, y: line.middle.y });
  await expect.poll(() => drawMap.hoveredPointPixels()).toEqual([line.middle]);

  await drawMap.hoverPoint({ x: neighbour.x + 5, y: neighbour.y });
  await expect.poll(() => drawMap.hoveredPointPixels()).toEqual([neighbour]);
});

test("generated midpoints light up too, where the gap matters most", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ pointGeneration: "auto" });
  await drawMap.parkPointer();

  const midpoint = { x: Math.round((line.first.x + line.middle.x) / 2), y: line.first.y };
  await drawMap.hoverPoint(midpoint);

  await expect.poll(() => drawMap.hoveredPointIds()).toHaveLength(1);
});

test("the halo goes dark when the pointer leaves the map", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ offset: true });
  await drawMap.hoverPoint(line.middle);
  await expect.poll(() => drawMap.hoveredPointIds()).toHaveLength(1);

  await drawMap.canvas.hover({ x: 5, y: 5 });

  await expect.poll(() => drawMap.hoveredPointIds()).toHaveLength(0);
});

test("the halo is really painted on the canvas, not just recorded in state", async ({ drawMap }) => {
  const line = await drawMap.openWithLine();
  const insideGrabArea = { x: line.middle.x, y: line.middle.y - 10 };

  await drawMap.parkPointer();
  const idle = await drawMap.canvas.pixelAt(insideGrabArea);

  await drawMap.hoverPoint(line.middle);
  const hovered = await drawMap.canvas.pixelAt(insideGrabArea);

  expect(hovered[0]).toBeLessThan(idle[0] - 10);
});
