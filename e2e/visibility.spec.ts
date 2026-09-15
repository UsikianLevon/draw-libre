import type { DrawOptions } from "../src/index";
import { test } from "./fixtures";

type Rgb = [number, number, number];

const LINE: Rgb = [0, 0, 255];
const FILL: Rgb = [0, 255, 0];
const POINT: Rgb = [255, 0, 255];
const FIRST_POINT: Rgb = [255, 255, 0];

const css = ([r, g, b]: Rgb) => `rgb(${r}, ${g}, ${b})`;

const PAINTED: DrawOptions = {
  dynamicLine: false,
  layersPaint: {
    line: { "line-color": css(LINE), "line-width": 8, "line-opacity": 1 },
    polygon: { "fill-color": css(FILL), "fill-opacity": 1 },
    points: { "circle-color": css(POINT) },
    firstPoint: { "circle-color": css(FIRST_POINT) },
  },
};

test("a drawn line shows its configured color on the canvas", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: PAINTED });

  await drawMap.drawing.expectPixelNear(drawMap.layout.segmentMidpoint(line.first, line.middle), LINE);
  await drawMap.drawing.expectPixelNear(drawMap.layout.segmentMidpoint(line.middle, line.last), LINE);
});

test("a closed polygon shows its configured fill inside, and undoing the closing takes the fill away", async ({
  drawMap,
}) => {
  await drawMap.open({ options: { ...PAINTED, modes: { initial: "polygon" } } });
  const triangle = await drawMap.drawClosedTriangle();
  const inside = drawMap.layout.centroid([triangle.a, triangle.b, triangle.c]);

  await drawMap.drawing.expectPixelNear(inside, FILL);

  await drawMap.undo();

  await drawMap.drawing.expectPixelNotNear(inside, FILL);
});

test("points show their configured color at their centers, and the first point shows its own", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: PAINTED });
  await drawMap.parkPointer();

  await drawMap.drawing.expectPixelNear(line.middle, POINT);
  await drawMap.drawing.expectPixelNear(line.last, POINT);
  await drawMap.drawing.expectPixelNear(line.first, FIRST_POINT);
});

test("after dragging a point the line color leaves the old segments and shows along the new ones", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine({ options: PAINTED });
  const moved = drawMap.layout.offsetFrom(line.middle, 0, 120);
  const oldFirst = drawMap.layout.segmentMidpoint(line.first, line.middle);
  const oldSecond = drawMap.layout.segmentMidpoint(line.middle, line.last);
  await drawMap.drawing.expectPixelNear(oldFirst, LINE);
  await drawMap.drawing.expectPixelNear(oldSecond, LINE);

  await drawMap.dragPoint(line.middle, moved);
  await drawMap.events.expectCount("mdl:moveend", 1);
  await drawMap.parkPointer();

  await drawMap.drawing.expectPixelNear(drawMap.layout.segmentMidpoint(line.first, moved), LINE);
  await drawMap.drawing.expectPixelNear(drawMap.layout.segmentMidpoint(moved, line.last), LINE);
  await drawMap.drawing.expectPixelNotNear(oldFirst, LINE);
  await drawMap.drawing.expectPixelNotNear(oldSecond, LINE);
});
