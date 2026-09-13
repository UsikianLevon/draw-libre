import type { ListNode, Store } from "#app/store/index";
import type { LatLng, Point, RequiredDrawOptions, Step } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";

type GeometrySource = () => { head: ListNode | null; isCircular: boolean };

export class GeometryPixels {
  #dirty = true;
  #nodes: ListNode[] = [];
  #pixels: Point[] = [];

  constructor(
    private readonly source: GeometrySource,
    private readonly project: (coords: LatLng) => Point,
  ) {}

  invalidate = () => {
    this.#dirty = true;
  };

  read = () => {
    if (this.#dirty) {
      const { head, isCircular } = this.source();
      this.#nodes = orderedNodes(head, isCircular);
      this.#pixels = this.#nodes.map((node) => this.project(node.val as Step));
      this.#dirty = false;
    }

    return { nodes: this.#nodes, pixels: this.#pixels };
  };
}

export const orderedNodes = (head: ListNode | null, isCircular: boolean): ListNode[] => {
  const nodes: ListNode[] = [];
  const visited = new Set<ListNode>();
  let current = head;

  while (current && !visited.has(current)) {
    visited.add(current);
    if (current.val) {
      nodes.push(current);
    }
    current = current.next;
  }

  if (isCircular && head?.val && nodes.length > 1) {
    nodes.push(head);
  }

  return nodes;
};

export type NearestVertex = {
  index: number;
  distance: number;
};

export const nearestVertexPx = (vertices: Point[], cursor: Point): NearestVertex | null => {
  let best: NearestVertex | null = null;

  for (let index = 0; index < vertices.length; index++) {
    const vertex = vertices[index];
    if (!vertex) continue;

    const distance = Math.hypot(cursor.x - vertex.x, cursor.y - vertex.y);

    if (!best || distance < best.distance) {
      best = { index, distance };
    }
  }

  return best;
};

export type NearestSegment = {
  index: number;
  projected: Point;
  t: number;
  distance: number;
};

export const nearestSegmentPx = (vertices: Point[], cursor: Point): NearestSegment | null => {
  let best: NearestSegment | null = null;

  for (let index = 0; index < vertices.length - 1; index++) {
    const a = vertices[index];
    const b = vertices[index + 1];
    if (!a || !b) continue;

    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lengthSquared = abx * abx + aby * aby;
    const t = lengthSquared === 0 ? 0 : ((cursor.x - a.x) * abx + (cursor.y - a.y) * aby) / lengthSquared;
    const clamped = Math.min(1, Math.max(0, t));
    const projected = { x: a.x + abx * clamped, y: a.y + aby * clamped };
    const distance = Math.hypot(cursor.x - projected.x, cursor.y - projected.y);

    if (!best || distance < best.distance) {
      best = { index, projected, t: clamped, distance };
    }
  }

  return best;
};

const DESYNC_TOLERANCE = 2;

export type SegmentHit = {
  segmentStart: ListNode;
  projected: LatLng;
  distance: number;
  vertexDistance: number;
};

type ProjectionContext = {
  map: UnifiedMap;
  store: Store;
  options: RequiredDrawOptions;
};

export class GeometryProjection {
  #pixels: GeometryPixels;

  constructor(private readonly ctx: ProjectionContext) {
    this.#pixels = new GeometryPixels(
      () => ({ head: ctx.store.head, isCircular: ctx.store.circular.isCircular() }),
      (coords) => ctx.map.project(coords),
    );

    ctx.store.addObserver(this.#pixels.invalidate);
    ctx.map.on("move", this.#pixels.invalidate);
  }

  public remove = () => {
    this.ctx.store.removeObserver(this.#pixels.invalidate);
    this.ctx.map.off("move", this.#pixels.invalidate);
  };

  #toGeometryCopy = (cursor: Point, reference: Step): Point => {
    const { map } = this.ctx;
    const copies = Math.round((map.unproject([cursor.x, cursor.y]).lng - reference.lng) / 360);
    if (copies === 0) return cursor;

    const origin = map.project(reference);
    const shifted = map.project({ lng: reference.lng + 360, lat: reference.lat });

    return { x: cursor.x - (shifted.x - origin.x) * copies, y: cursor.y - (shifted.y - origin.y) * copies };
  };

  public hit = (cursor: Point): SegmentHit | null => {
    const { nodes, pixels } = this.#pixels.read();
    const reference = nodes[0]?.val;
    if (!reference) return null;

    const localCursor = this.#toGeometryCopy(cursor, reference);
    const segment = nearestSegmentPx(pixels, localCursor);
    if (!segment) return null;
    if (segment.distance > this.ctx.options.interaction.lineHitRadius * DESYNC_TOLERANCE) return null;

    const segmentStart = nodes[segment.index];
    if (!segmentStart) return null;

    const vertex = nearestVertexPx(pixels, localCursor);
    const projected = this.ctx.map.unproject([segment.projected.x, segment.projected.y]);

    return {
      segmentStart,
      projected: { lat: projected.lat, lng: projected.lng },
      distance: segment.distance,
      vertexDistance: vertex ? vertex.distance : Infinity,
    };
  };

  public isNearGeometry = (cursor: Point): boolean => {
    const { nodes, pixels } = this.#pixels.read();
    const reference = nodes[0]?.val;
    if (!reference) return false;

    const localCursor = this.#toGeometryCopy(cursor, reference);
    const vertex = nearestVertexPx(pixels, localCursor);
    if (vertex && vertex.distance <= this.ctx.options.interaction.pointHitRadius) return true;

    const segment = nearestSegmentPx(pixels, localCursor);
    return segment !== null && segment.distance <= this.ctx.options.interaction.lineHitRadius;
  };
}
