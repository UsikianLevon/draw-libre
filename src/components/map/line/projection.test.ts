import { expect, test } from "vitest";

import { ListNode } from "#app/store/index";
import type { Store } from "#app/store/index";
import type { RequiredDrawOptions, Step } from "#app/types/index";
import type { EngineMap } from "#app/types/engine";

import { GeometryPixels, GeometryProjection, nearestSegmentPx, nearestVertexPx, orderedNodes } from "./projection";

const chain = (...ids: string[]) => {
  const nodes = ids.map((id) => new ListNode({ id, lat: 0, lng: 0, isAuxiliary: false } as Step));
  nodes.forEach((node, index) => {
    node.next = nodes[index + 1] ?? null;
    node.prev = nodes[index - 1] ?? null;
  });
  return nodes;
};

const chainAt = (...points: [number, number][]) => {
  const nodes = points.map(
    ([x, y], index) => new ListNode({ id: String(index), lat: y, lng: x, isAuxiliary: false } as Step),
  );
  nodes.forEach((node, index) => {
    node.next = nodes[index + 1] ?? null;
    node.prev = nodes[index - 1] ?? null;
  });
  return nodes;
};

const projectionOver = (nodes: ListNode[]) => {
  const map = {
    project: (coords: { lng: number; lat: number }) => ({ x: coords.lng, y: coords.lat }),
    unproject: ([x, y]: [number, number]) => ({ lng: x, lat: y }),
    on: () => {},
    off: () => {},
  } as unknown as EngineMap;
  const store = {
    head: nodes[0] ?? null,
    circular: { isCircular: () => false },
    addObserver: () => {},
    removeObserver: () => {},
  } as unknown as Store;
  const options = { interaction: { lineHitRadius: 7, pointHitRadius: 14 } } as unknown as RequiredDrawOptions;

  return new GeometryProjection({ map, store, options });
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

test("a cursor within the point hit radius of a vertex is near the geometry", () => {
  const projection = projectionOver(chainAt([0, 0], [100, 0]));

  expect(projection.isNearGeometry({ x: 108, y: 9 })).toBe(true);
});

test("a cursor within the line hit radius of a segment is near the geometry", () => {
  const projection = projectionOver(chainAt([0, 0], [100, 0]));

  expect(projection.isNearGeometry({ x: 50, y: 6 })).toBe(true);
});

test("a cursor beside the line but outside both radii is off the geometry", () => {
  const projection = projectionOver(chainAt([0, 0], [100, 0]));

  expect(projection.isNearGeometry({ x: 50, y: 12 })).toBe(false);
});

test("a single vertex counts even though it has no segment", () => {
  const projection = projectionOver(chainAt([40, 40]));

  expect(projection.isNearGeometry({ x: 45, y: 45 })).toBe(true);
});

test("an empty geometry is never near the cursor", () => {
  const projection = projectionOver([]);

  expect(projection.isNearGeometry({ x: 0, y: 0 })).toBe(false);
});
