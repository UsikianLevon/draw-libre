import { expect, test } from "vitest";

import { ListNode } from "#app/store/index";
import type { Step } from "#app/types/index";

import { GeometryPixels, nearestSegmentPx, nearestVertexPx, orderedNodes } from "./projection";

const chain = (...ids: string[]) => {
  const nodes = ids.map((id) => new ListNode({ id, lat: 0, lng: 0, isAuxiliary: false } as Step));
  nodes.forEach((node, index) => {
    node.next = nodes[index + 1] ?? null;
    node.prev = nodes[index - 1] ?? null;
  });
  return nodes;
};

const idsOf = (nodes: ListNode[]) => nodes.map((node) => node.val?.id);

test("projects the cursor onto the segment it is nearest to", () => {
  const vertices = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  const hit = nearestSegmentPx(vertices, { x: 40, y: 6 });

  expect(hit).toEqual({ index: 0, projected: { x: 40, y: 0 }, t: 0.4, distance: 6 });
});

test("clamps the projection to the segment end the cursor overshoots", () => {
  const vertices = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  const hit = nearestSegmentPx(vertices, { x: 140, y: 0 });

  expect(hit).toEqual({ index: 0, projected: { x: 100, y: 0 }, t: 1, distance: 40 });
});

test("picks the closest segment out of several", () => {
  const vertices = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  const hit = nearestSegmentPx(vertices, { x: 96, y: 60 });

  expect(hit?.index).toBe(1);
  expect(hit?.projected).toEqual({ x: 100, y: 60 });
});

test("keeps the earliest segment when two are equally close", () => {
  const vertices = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  const hit = nearestSegmentPx(vertices, { x: 50, y: 10 });

  expect(hit?.index).toBe(0);
});

test("returns null when there is no segment to project onto", () => {
  expect(nearestSegmentPx([{ x: 10, y: 10 }], { x: 0, y: 0 })).toBeNull();
});

test("falls back to the vertex itself on a zero length segment", () => {
  const vertices = [
    { x: 50, y: 50 },
    { x: 50, y: 50 },
  ];

  const hit = nearestSegmentPx(vertices, { x: 53, y: 54 });

  expect(hit).toEqual({ index: 0, projected: { x: 50, y: 50 }, t: 0, distance: 5 });
});

test("walks an open line from head to tail", () => {
  const nodes = chain("a", "b", "c");

  expect(idsOf(orderedNodes(nodes[0]!, false))).toEqual(["a", "b", "c"]);
});

test("repeats the head at the end so the closing segment exists", () => {
  const nodes = chain("a", "b", "c");
  nodes[2]!.next = nodes[0]!;
  nodes[0]!.prev = nodes[2]!;

  expect(idsOf(orderedNodes(nodes[0]!, true))).toEqual(["a", "b", "c", "a"]);
});

test("stops instead of looping forever when the ring is not flagged circular", () => {
  const nodes = chain("a", "b", "c");
  nodes[2]!.next = nodes[1]!;

  expect(idsOf(orderedNodes(nodes[0]!, false))).toEqual(["a", "b", "c"]);
});

test("reports the vertex the cursor is closest to", () => {
  const vertices = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  expect(nearestVertexPx(vertices, { x: 97, y: 4 })).toEqual({ index: 1, distance: 5 });
});

test("has no nearest vertex without vertices", () => {
  expect(nearestVertexPx([], { x: 0, y: 0 })).toBeNull();
});

test("projects every vertex once and reuses the result until invalidated", () => {
  const nodes = chain("a", "b", "c");
  let projections = 0;
  const pixels = new GeometryPixels(
    () => ({ head: nodes[0]!, isCircular: false }),
    () => {
      projections += 1;
      return { x: projections, y: 0 };
    },
  );

  pixels.read();
  pixels.read();

  expect(projections).toBe(3);

  pixels.invalidate();
  pixels.read();

  expect(projections).toBe(6);
});

test("keeps nodes and pixels aligned", () => {
  const nodes = chain("a", "b", "c");
  nodes[2]!.next = nodes[0]!;
  const pixels = new GeometryPixels(
    () => ({ head: nodes[0]!, isCircular: true }),
    (step) => ({ x: step.lng, y: step.lat }),
  );

  const read = pixels.read();

  expect(idsOf(read.nodes)).toEqual(["a", "b", "c", "a"]);
  expect(read.pixels).toHaveLength(4);
});

test("skips nodes that carry no step", () => {
  const nodes = chain("a", "b", "c");
  nodes[1]!.val = null;

  expect(idsOf(orderedNodes(nodes[0]!, false))).toEqual(["a", "c"]);
});
