import type { DrawOptions } from "../src/index";
import { test } from "./fixtures";

type Rgb = [number, number, number];

const LINE: Rgb = [0, 0, 255];
const POINT: Rgb = [255, 0, 255];
const FIRST_POINT: Rgb = [255, 200, 0];
const AUXILIARY_POINT: Rgb = [0, 200, 200];
const ON_LINE_POINT: Rgb = [255, 128, 0];
const DYNAMIC_LINE: Rgb = [128, 0, 200];
const BREAK_LINE: Rgb = [0, 140, 0];
const POLYGON: Rgb = [180, 255, 120];
const RING: Rgb = [0, 200, 200];
const CLOSING_RING: Rgb = [255, 100, 100];
const STOCK_RING: Rgb = [102, 102, 102];

const css = ([r, g, b]: Rgb) => `rgb(${r}, ${g}, ${b})`;

const PAINTED: DrawOptions = {
  layersPaint: {
    line: { "line-color": css(LINE), "line-opacity": 1 },
    points: { "circle-color": css(POINT) },
    firstPoint: { "circle-color": css(FIRST_POINT) },
    auxiliaryPoint: { "circle-color": css(AUXILIARY_POINT) },
    onLinePoint: { "circle-color": css(ON_LINE_POINT) },
    dynamicLine: { "line-color": css(DYNAMIC_LINE) },
    breakLine: { "line-color": css(BREAK_LINE) },
    polygon: { "fill-color": css(POLYGON), "fill-opacity": 1 },
  },
};

const BIG_FIRST_POINT: DrawOptions = {
  layersPaint: {
    firstPoint: {
      "circle-color": css(FIRST_POINT),
      "circle-radius": 10,
      "circle-stroke-width": 4,
      "circle-stroke-color": css(RING),
    },
  },
};

const EXPRESSION_FIRST_POINT: DrawOptions = {
  layersPaint: {
    firstPoint: {
      "circle-color": css(FIRST_POINT),
      "circle-radius": ["+", 5, 5],
      "circle-stroke-width": 4,
    },
  },
};

test("a line, its points and its first point show their configured colors", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: PAINTED });
  await drawMap.parkPointer();

  await drawMap.drawing.expectPixelNear(drawMap.layout.alongSegment(line.first, line.middle, 0.25), LINE);
  await drawMap.drawing.expectPixelNear(line.middle, POINT);
  await drawMap.drawing.expectPixelNear(line.first, FIRST_POINT);
});

test("generated midpoints show their configured color in auto mode", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: { ...PAINTED, pointGeneration: "auto" } });
  await drawMap.parkPointer();
  await drawMap.drawing.expectAuxiliaryCount(2);

  await drawMap.drawing.expectPixelNear(drawMap.layout.segmentMidpoint(line.first, line.middle), AUXILIARY_POINT);
});

test("hovering a segment shows the insert point in its configured color", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: PAINTED });
  await drawMap.parkPointer();
  const cursor = drawMap.layout.segmentMidpoint(line.first, line.middle);

  await drawMap.canvas.hover(cursor);
  await drawMap.drawing.expectGhostOnSegment(cursor, line.first, line.middle);

  await drawMap.drawing.expectPixelNear(cursor, ON_LINE_POINT);
});

test("the dynamic line shows its own configured color", async ({ drawMap }) => {
  await drawMap.open({ options: PAINTED });
  const first = drawMap.layout.line.first;
  const cursor = drawMap.layout.offsetFrom(first, 200, 150);

  await drawMap.drawPoint(first);
  await drawMap.canvas.hoverThrough(cursor);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);

  await drawMap.drawing.expectPixelNearAlong(first, cursor, DYNAMIC_LINE);
});

test("without a color of its own the dynamic line takes the line color", async ({ drawMap }) => {
  await drawMap.open({ options: { layersPaint: { line: { "line-color": css(LINE), "line-opacity": 1 } } } });
  const first = drawMap.layout.line.first;
  const cursor = drawMap.layout.offsetFrom(first, 200, 150);

  await drawMap.drawPoint(first);
  await drawMap.canvas.hoverThrough(cursor);
  await drawMap.drawing.expectDynamicLineEndAt(cursor);

  await drawMap.drawing.expectPixelNearAlong(first, cursor, LINE);
});

test("in break mode the highlighted segment shows its configured color", async ({ drawMap }) => {
  await drawMap.open({ options: { ...PAINTED, modes: { initial: "polygon" } } });
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.enterBreakMode();

  await drawMap.hoverSegment(triangle.b, triangle.c);

  await drawMap.drawing.expectPixelNearAlong(triangle.b, triangle.c, BREAK_LINE);
});

test("a closed polygon shows its configured fill and the first point keeps its color on top", async ({ drawMap }) => {
  await drawMap.open({ options: { ...PAINTED, modes: { initial: "polygon" } } });
  const triangle = await drawMap.drawClosedTriangle();
  await drawMap.parkPointer();
  const inside = drawMap.layout.centroid([triangle.a, triangle.b, triangle.c]);

  await drawMap.drawing.expectPixelNear(inside, POLYGON);
  await drawMap.drawing.expectPixelNear(triangle.a, FIRST_POINT);
});

test("the first point takes its configured radius and stroke color", async ({ drawMap }) => {
  await drawMap.open({ options: BIG_FIRST_POINT });
  const { first, middle } = drawMap.layout.line;
  await drawMap.drawPoint(first);
  await drawMap.drawPoint(middle);
  await drawMap.parkPointer();

  await drawMap.drawing.expectPixelNear(drawMap.layout.offsetFrom(first, 0, -5), FIRST_POINT);
  await drawMap.drawing.expectPixelNear(drawMap.layout.offsetFrom(first, 0, -11), RING);
});

test("when the line can be closed the first point keeps its configured size and shows the closing stroke", async ({
  drawMap,
}) => {
  const line = await drawMap.openWithLine({ options: BIG_FIRST_POINT });
  await drawMap.parkPointer();

  await drawMap.drawing.expectPixelNear(drawMap.layout.offsetFrom(line.first, 0, -6), FIRST_POINT);
  await drawMap.drawing.expectPixelNear(drawMap.layout.offsetFrom(line.first, 0, -12), CLOSING_RING);
});

test("a first point radius given as an expression keeps its size when the line can be closed", async ({ drawMap }) => {
  const line = await drawMap.openWithLine({ options: EXPRESSION_FIRST_POINT });
  await drawMap.parkPointer();

  await drawMap.drawing.expectPixelNear(drawMap.layout.offsetFrom(line.first, 0, -5), FIRST_POINT);
  await drawMap.drawing.expectPixelNear(drawMap.layout.offsetFrom(line.first, 0, -11), CLOSING_RING);
});

test("without paint options the first point shows a grey ring while the line cannot close and a red ring when it can", async ({
  drawMap,
}) => {
  await drawMap.open();
  const line = drawMap.layout.line;
  await drawMap.drawPoint(line.first);
  await drawMap.drawPoint(line.middle);
  await drawMap.sweepPointer();

  await drawMap.drawing.expectPixelNear(drawMap.layout.offsetFrom(line.first, 6, 0), STOCK_RING);

  await drawMap.drawPoint(line.last);
  await drawMap.sweepPointer();

  await drawMap.drawing.expectPixelNear(drawMap.layout.offsetFrom(line.first, 7, 0), CLOSING_RING);
});
