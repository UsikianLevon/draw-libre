import { expect, type Page } from "@playwright/test";

import type { Step } from "../../src/index";
import type { Pixel } from "./layout";

// единственное место в e2e, где разрешены эти id, все спеки обращаются к методам ниже
const LAYERS = {
  points: "mdl-points-layer",
  firstPoint: "mdl-first-point-layer",
  auxiliaryPoint: "mdl-auxiliary-point-layer",
  line: "mdl-line-layer",
  polygon: "mdl-polygon-layer",
  ghostPoint: "mdl-single-point-layer",
  dynamicLine: "mdl-line-dynamic-layer",
  breakLine: "mdl-line-break-layer",
  pointsHit: "mdl-points-hit-layer",
  firstPointHit: "mdl-first-point-hit-layer",
  auxiliaryPointHit: "mdl-auxiliary-point-hit-layer",
  transparentLine: "mdl-line-layer-transparent",
} as const;

const SOURCES = {
  unified: "mdl-unified-source",
  dynamicLine: "mdl-line-dynamic-source",
  breakLine: "mdl-line-source-break",
} as const;

const POINT_LAYERS = [LAYERS.points, LAYERS.firstPoint, LAYERS.auxiliaryPoint];
const HIT_LAYERS = [LAYERS.pointsHit, LAYERS.firstPointHit, LAYERS.auxiliaryPointHit];
const SHAPE_LAYERS = [LAYERS.line, LAYERS.polygon];

const SEGMENT_PROBE_PX = 2;
const POLYGON_PROBE_PX = 1;
const GHOST_PROBE_PX = 3;
const POINT_SEARCH_RADIUS_PX = 20;
const DYNAMIC_LINE_TOLERANCE_PX = 3;
const GHOST_TOLERANCE_PX = 1;
const MIDPOINT_TOLERANCE_PX = 1;
const BREAK_SEGMENT_TOLERANCE_PX = 1;
const COORDINATES_TOLERANCE_PX = 1;
const STALE_LINE_CLEARANCE_PX = 6;
const STALE_LINE_PROBE_FRACTIONS = [0.25, 0.5, 0.75];
const ALONG_FROM = 0.3;
const ALONG_TO = 0.7;
const ALONG_STEP = 0.02;

export interface DrawnPoint {
  id: string;
  lng: number;
  lat: number;
  auxiliary: boolean;
  first: boolean;
  px: Pixel;
}

type SourceData = { data: GeoJSON.FeatureCollection };

export class Drawing {
  constructor(
    private readonly page: Page,
    private readonly settle: () => Promise<void>,
  ) {}

  steps(): Promise<Step[]> {
    return this.page.evaluate(() => {
      if (!window.draw) throw new Error("the draw control is not mounted");
      return window.draw.getAllSteps("array") as Step[];
    });
  }

  async stepCoordinates(): Promise<[number, number][]> {
    return (await this.steps()).map((step) => [step.lng, step.lat]);
  }

  async duplicateStepCount(): Promise<number> {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const [lng, lat] of await this.stepCoordinates()) {
      const key = `${lng},${lat}`;
      if (seen.has(key)) duplicates += 1;
      seen.add(key);
    }
    return duplicates;
  }

  async stepPixelsOnCopy(copies: number): Promise<Pixel[]> {
    const steps = await this.steps();
    return this.page.evaluate(
      ({ coordinates, shift }) => {
        const box = window.map.getContainer().getBoundingClientRect();
        return coordinates.map(([lng, lat]) => {
          const point = window.map.project({ lng: lng + 360 * shift, lat });
          return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
        });
      },
      { coordinates: steps.map((step) => [step.lng, step.lat] as [number, number]), shift: copies },
    );
  }

  async expectStepOrder(ids: string[]) {
    await expect.poll(async () => (await this.steps()).map((step) => step.id)).toEqual(ids);
  }

  pixelOf(at: { lat: number; lng: number }): Promise<Pixel> {
    return this.page.evaluate((target) => {
      const box = window.map.getContainer().getBoundingClientRect();
      const point = window.map.project(target);
      return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
    }, at);
  }

  async expectCoordinatesAt(coordinates: unknown, at: Pixel, tolerancePx = COORDINATES_TOLERANCE_PX) {
    expect(coordinates).toMatchObject({ lat: expect.any(Number), lng: expect.any(Number) });
    const pixel = await this.pixelOf(coordinates as { lat: number; lng: number });
    expect(
      Math.hypot(pixel.x - at.x, pixel.y - at.y),
      `coordinates land at ${pixel.x}, ${pixel.y}`,
    ).toBeLessThanOrEqual(tolerancePx);
  }

  points(): Promise<DrawnPoint[]> {
    return this.page.evaluate((layers) => {
      const present = layers.filter((id) => window.map.getLayer(id));
      if (present.length === 0) return [];

      const box = window.map.getContainer().getBoundingClientRect();
      const seen = new Map<string, DrawnPoint>();

      for (const feature of window.map.queryRenderedFeatures({ layers: present })) {
        const id = String(feature.properties?.id);
        if (seen.has(id)) continue;
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const point = window.map.project({ lng, lat });
        seen.set(id, {
          id,
          lng,
          lat,
          auxiliary: feature.properties?.isAuxiliary === true,
          first: feature.properties?.isFirst === true,
          px: { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) },
        });
      }

      return [...seen.values()];
    }, POINT_LAYERS);
  }

  segmentPaintedBetween(a: Pixel, b: Pixel): Promise<boolean> {
    const midpoint = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
    return this.linePaintedAt(midpoint);
  }

  private linePaintedAt(at: Pixel): Promise<boolean> {
    return this.renderedAt(at, [LAYERS.line], SEGMENT_PROBE_PX);
  }

  async isClosed(): Promise<boolean> {
    const primaries = (await this.steps()).filter((step) => !step.isAuxiliary);
    if (primaries.length < 3) return false;
    if (!(await this.lineDataCloses())) return false;

    const [first, last] = await this.pixelsOf([primaries[0]!, primaries[primaries.length - 1]!]);
    return this.segmentPaintedBetween(first!, last!);
  }

  private lineDataCloses(): Promise<boolean> {
    return this.page.evaluate(
      ({ layer, source }) => {
        if (!window.map.getLayer(layer)) return false;

        const data = (window.map.getStyle().sources[source] as SourceData).data;
        const line = data.features.find((feature) => feature.geometry.type === "LineString")?.geometry as
          | GeoJSON.LineString
          | undefined;
        if (!line || line.coordinates.length < 4) return false;

        const first = line.coordinates[0]!;
        const last = line.coordinates[line.coordinates.length - 1]!;
        return first[0] === last[0] && first[1] === last[1];
      },
      { layer: LAYERS.line, source: SOURCES.unified },
    );
  }

  polygonPaintedAt(inside: Pixel): Promise<boolean> {
    return this.renderedAt(inside, [LAYERS.polygon], POLYGON_PROBE_PX);
  }

  async expectSegmentPainted(a: Pixel, b: Pixel) {
    await expect.poll(() => this.segmentPaintedBetween(a, b)).toBe(true);
  }

  async expectSegmentNotPainted(a: Pixel, b: Pixel) {
    await expect.poll(() => this.segmentPaintedBetween(a, b)).toBe(false);
    await this.settle();
    expect(await this.segmentPaintedBetween(a, b)).toBe(false);
  }

  async pathOf(steps: Step[], closed: boolean): Promise<Pixel[]> {
    const pixels = await this.pixelsOf(steps);
    return closed && pixels.length > 0 ? [...pixels, pixels[0]!] : pixels;
  }

  async expectLineAlong(path: Pixel[]) {
    for (const [a, b] of segmentsOf(path)) {
      await this.expectSegmentPainted(a, b);
    }
  }

  async expectLineGoneFrom(stale: Pixel[], current: Pixel[]) {
    const probes = segmentsOf(stale)
      .flatMap(([a, b]) =>
        STALE_LINE_PROBE_FRACTIONS.map((fraction) => ({
          x: Math.round(a.x + (b.x - a.x) * fraction),
          y: Math.round(a.y + (b.y - a.y) * fraction),
        })),
      )
      .filter((probe) =>
        segmentsOf(current).every(([a, b]) => distanceToSegment(probe, a, b) > STALE_LINE_CLEARANCE_PX),
      );
    if (probes.length === 0) return;

    await expect.poll(() => this.linePaintedAtAny(probes)).toBe(false);
    await this.settle();
    expect(await this.linePaintedAtAny(probes)).toBe(false);
  }

  private async linePaintedAtAny(probes: Pixel[]): Promise<boolean> {
    for (const probe of probes) {
      if (await this.linePaintedAt(probe)) return true;
    }
    return false;
  }

  async expectPointNear(at: Pixel, radiusPx = 1) {
    await expect.poll(() => this.pointNear(at, radiusPx)).not.toBeNull();
  }

  async expectNoPointNear(at: Pixel, radiusPx: number) {
    await expect.poll(() => this.pointNear(at, radiusPx)).toBeNull();
    await this.settle();
    expect(await this.pointNear(at, radiusPx)).toBeNull();
  }

  async expectBreakSegmentShown() {
    await expect.poll(() => this.breakSegment()).not.toBeNull();
  }

  async expectBreakSegment(a: Pixel, b: Pixel, tolerancePx = BREAK_SEGMENT_TOLERANCE_PX) {
    const distance = (p: Pixel, q: Pixel) => Math.hypot(p.x - q.x, p.y - q.y);
    await expect
      .poll(async () => {
        const segment = await this.breakSegment();
        if (!segment) return Number.POSITIVE_INFINITY;
        const [start, end] = segment;
        const forward = Math.max(distance(start, a), distance(end, b));
        const backward = Math.max(distance(start, b), distance(end, a));
        return Math.round(Math.min(forward, backward));
      })
      .toBeLessThanOrEqual(tolerancePx);
    await expect.poll(() => this.breakSourceShape()).toEqual({ features: 1, coordinates: [2] });
  }

  async expectNoBreakSegment() {
    await expect.poll(() => this.breakSegment()).toBeNull();
    await this.settle();
    expect(await this.breakSegment()).toBeNull();
  }

  ghostPoint(): Promise<Pixel | null> {
    return this.page.evaluate((layer) => {
      if (!window.map.getLayer(layer)) return null;
      const feature = window.map.queryRenderedFeatures({ layers: [layer] })[0];
      if (!feature) return null;

      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      const box = window.map.getContainer().getBoundingClientRect();
      const point = window.map.project({ lng, lat });

      return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
    }, LAYERS.ghostPoint);
  }

  dynamicLineEnd(): Promise<Pixel | null> {
    return this.dynamicLineCoordinateAt(-1);
  }

  private dynamicLineCoordinateAt(index: number): Promise<Pixel | null> {
    return this.page.evaluate(
      ({ layer, source, index }) => {
        if (!window.map.getLayer(layer)) return null;
        if (window.map.queryRenderedFeatures({ layers: [layer] }).length === 0) return null;

        const data = (window.map.getStyle().sources[source] as SourceData).data;
        const line = data.features[0]?.geometry as GeoJSON.LineString | undefined;
        if (!line || line.coordinates.length === 0) return null;
        const at = index < 0 ? line.coordinates.length + index : index;
        const coordinate = line.coordinates[at];
        if (!coordinate) return null;

        const box = window.map.getContainer().getBoundingClientRect();
        const point = window.map.project({ lng: coordinate[0] as number, lat: coordinate[1] as number });

        return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
      },
      { layer: LAYERS.dynamicLine, source: SOURCES.dynamicLine, index },
    );
  }

  breakSegment(): Promise<[Pixel, Pixel] | null> {
    return this.page.evaluate(
      ({ layer, source }) => {
        if (!window.map.getLayer(layer)) return null;
        if (window.map.queryRenderedFeatures({ layers: [layer] }).length === 0) return null;

        const data = (window.map.getStyle().sources[source] as SourceData).data;
        const line = data.features[0]?.geometry as GeoJSON.LineString | undefined;
        if (!line || line.coordinates.length < 2) return null;

        const box = window.map.getContainer().getBoundingClientRect();
        const toPixel = ([lng, lat]: number[]) => {
          const point = window.map.project({ lng: lng as number, lat: lat as number });
          return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
        };

        return [toPixel(line.coordinates[0]!), toPixel(line.coordinates[1]!)];
      },
      { layer: LAYERS.breakLine, source: SOURCES.breakLine },
    );
  }

  private breakSourceShape(): Promise<{ features: number; coordinates: number[] } | null> {
    return this.page.evaluate((source) => {
      if (!window.map.getSource(source)) return null;
      const data = (window.map.getStyle().sources[source] as SourceData).data;
      return {
        features: data.features.length,
        coordinates: data.features.map((feature) => (feature.geometry as GeoJSON.LineString).coordinates.length),
      };
    }, SOURCES.breakLine);
  }

  pointNear(at: Pixel, radiusPx = POINT_SEARCH_RADIUS_PX): Promise<Pixel | null> {
    return this.page.evaluate(
      ({ target, radius, layers }) => {
        const present = layers.filter((id) => window.map.getLayer(id));
        if (present.length === 0) return null;

        const painted = window.map.queryRenderedFeatures({ layers: present });
        const box = window.map.getContainer().getBoundingClientRect();

        let best: { x: number; y: number } | null = null;
        let bestDistance = Number.POSITIVE_INFINITY;

        for (const feature of painted) {
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          const point = window.map.project({ lng, lat });
          const screen = { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
          const distance = Math.hypot(screen.x - target.x, screen.y - target.y);

          if (distance < bestDistance) {
            bestDistance = distance;
            best = screen;
          }
        }

        return bestDistance <= radius ? best : null;
      },
      { target: at, radius: radiusPx, layers: POINT_LAYERS },
    );
  }

  hoveredPointIds(): Promise<string[]> {
    return this.page.evaluate((source) => {
      if (!window.map.getSource(source)) return [];
      const data = (window.map.getStyle().sources[source] as SourceData).data;

      return data.features
        .filter((feature) => feature.geometry.type === "Point")
        .filter((feature) => {
          const id = String(feature.properties?.id);
          return window.map.getFeatureState({ source, id }).hover === true;
        })
        .map((feature) => String(feature.properties?.id));
    }, SOURCES.unified);
  }

  hoveredPointPixels(): Promise<Pixel[]> {
    return this.page.evaluate((source) => {
      if (!window.map.getSource(source)) return [];
      const data = (window.map.getStyle().sources[source] as SourceData).data;
      const box = window.map.getContainer().getBoundingClientRect();

      return data.features
        .filter((feature) => feature.geometry.type === "Point")
        .filter((feature) => {
          const id = String(feature.properties?.id);
          return window.map.getFeatureState({ source, id }).hover === true;
        })
        .map((feature) => {
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          const point = window.map.project({ lng, lat });
          return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
        });
    }, SOURCES.unified);
  }

  async expectPointCount(count: number) {
    await expect.poll(async () => (await this.points()).length).toBe(count);
  }

  async expectPrimaryCount(count: number) {
    await expect.poll(async () => (await this.points()).filter((point) => !point.auxiliary).length).toBe(count);
  }

  async expectAuxiliaryCount(count: number) {
    await expect.poll(async () => (await this.points()).filter((point) => point.auxiliary).length).toBe(count);
  }

  async expectAuxiliaryPointsHalfway(tolerancePx = MIDPOINT_TOLERANCE_PX) {
    await expect.poll(() => this.largestAuxiliaryOffset()).toBeLessThanOrEqual(tolerancePx);
  }

  async expectEmpty() {
    await this.expectPointCount(0);
    await expect.poll(() => this.renderedAnywhere(SHAPE_LAYERS)).toBe(false);
    await this.settle();
    expect(await this.points()).toHaveLength(0);
    expect(await this.renderedAnywhere(SHAPE_LAYERS)).toBe(false);
  }

  async expectClosed() {
    await expect.poll(() => this.isClosed()).toBe(true);
  }

  async expectOpen() {
    await expect.poll(() => this.isClosed()).toBe(false);
    await this.settle();
    expect(await this.isClosed()).toBe(false);
  }

  async expectPolygonPainted(inside: Pixel, painted: boolean) {
    await expect.poll(() => this.polygonPaintedAt(inside)).toBe(painted);
    if (painted) return;
    await this.settle();
    expect(await this.polygonPaintedAt(inside)).toBe(false);
  }

  async expectGhostOnSegment(cursor: Pixel, from: Pixel, to: Pixel, tolerancePx = GHOST_TOLERANCE_PX) {
    const abx = to.x - from.x;
    const aby = to.y - from.y;
    const lengthSquared = abx * abx + aby * aby;
    const t = Math.min(1, Math.max(0, ((cursor.x - from.x) * abx + (cursor.y - from.y) * aby) / lengthSquared));
    const expected = { x: from.x + abx * t, y: from.y + aby * t };

    await expect
      .poll(async () => {
        const at = await this.ghostPoint();
        return at ? Math.round(Math.hypot(at.x - expected.x, at.y - expected.y)) : Number.POSITIVE_INFINITY;
      })
      .toBeLessThanOrEqual(tolerancePx);
  }

  async expectGhostRenderedAt(at: Pixel, radiusPx = GHOST_PROBE_PX) {
    await expect.poll(() => this.renderedAt(at, [LAYERS.ghostPoint], radiusPx)).toBe(true);
  }

  async expectGhostVisible() {
    await expect.poll(() => this.ghostPoint()).not.toBeNull();
  }

  async expectGhostStillVisible() {
    await expect.poll(() => this.ghostPoint()).not.toBeNull();
    await this.settle();
    expect(await this.ghostPoint()).not.toBeNull();
  }

  async expectGhostHidden() {
    await expect.poll(() => this.ghostPoint()).toBeNull();
    await this.settle();
    expect(await this.ghostPoint()).toBeNull();
  }

  async expectDynamicLineEndAt(cursor: Pixel) {
    await expect
      .poll(async () => {
        const end = await this.dynamicLineEnd();
        return end ? Math.round(Math.hypot(end.x - cursor.x, end.y - cursor.y)) : Number.POSITIVE_INFINITY;
      })
      .toBeLessThanOrEqual(DYNAMIC_LINE_TOLERANCE_PX);
  }

  async expectDynamicLineFrom(at: Pixel) {
    await expect
      .poll(async () => {
        const start = await this.dynamicLineCoordinateAt(0);
        return start ? Math.round(Math.hypot(start.x - at.x, start.y - at.y)) : Number.POSITIVE_INFINITY;
      })
      .toBeLessThanOrEqual(DYNAMIC_LINE_TOLERANCE_PX);
  }

  async expectDynamicLineHidden() {
    await expect.poll(() => this.dynamicLineEnd()).toBeNull();
    await this.settle();
    expect(await this.dynamicLineEnd()).toBeNull();
  }

  async pixelAt(at: Pixel): Promise<[number, number, number]> {
    const [pixel] = await this.pixelsAt([at]);
    return pixel!;
  }

  private pixelsAt(targets: Pixel[]): Promise<[number, number, number][]> {
    return this.page.evaluate(
      (points) =>
        new Promise<[number, number, number][]>((resolve, reject) => {
          const map = window.map;
          const canvas = map.getCanvas();
          const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
          if (!gl) {
            reject(new Error("no webgl context"));
            return;
          }

          const box = canvas.getBoundingClientRect();
          const ratio = canvas.width / box.width;

          const read = () => {
            map.off("render", read);
            resolve(
              points.map((target) => {
                const pixel = new Uint8Array(4);
                const x = Math.round((target.x - box.left) * ratio);
                const y = Math.round((box.height - (target.y - box.top)) * ratio);
                gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                return [pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0];
              }),
            );
          };

          map.on("render", read);
          map.triggerRepaint();
        }),
      targets,
    );
  }

  async expectPixelNear(at: Pixel, rgb: [number, number, number], tolerance = 24) {
    await expect.poll(() => this.pixelDistance(at, rgb)).toBeLessThanOrEqual(tolerance);
  }

  async expectPixelNotNear(at: Pixel, rgb: [number, number, number], tolerance = 24) {
    await expect.poll(() => this.pixelDistance(at, rgb)).toBeGreaterThan(tolerance);
    await this.settle();
    expect(await this.pixelDistance(at, rgb)).toBeGreaterThan(tolerance);
  }

  async expectPixelNearAlong(a: Pixel, b: Pixel, rgb: [number, number, number], tolerance = 24) {
    const samples: Pixel[] = [];
    for (let fraction = ALONG_FROM; fraction <= ALONG_TO + ALONG_STEP / 2; fraction += ALONG_STEP) {
      samples.push({ x: Math.round(a.x + (b.x - a.x) * fraction), y: Math.round(a.y + (b.y - a.y) * fraction) });
    }

    await expect
      .poll(async () => {
        const pixels = await this.pixelsAt(samples);
        return Math.min(...pixels.map((pixel) => channelDistance(pixel, rgb)));
      })
      .toBeLessThanOrEqual(tolerance);
  }

  private async pixelDistance(at: Pixel, rgb: [number, number, number]): Promise<number> {
    return channelDistance(await this.pixelAt(at), rgb);
  }

  cursor(): Promise<string> {
    return this.page.evaluate(() => window.map.getCanvasContainer().style.cursor);
  }

  async expectCursor(cursor: string) {
    await expect.poll(() => this.cursor()).toBe(cursor);
  }

  mapStyleFootprint(): Promise<{ layers: string[]; sources: string[] }> {
    return this.page.evaluate(() => {
      const style = window.map.getStyle();
      return { layers: style.layers.map((layer) => layer.id), sources: Object.keys(style.sources) };
    });
  }

  hitAreasVisible(): Promise<boolean> {
    return this.page.evaluate(
      (layers) =>
        layers.every(
          (id) => window.map.getLayer(id) !== undefined && window.map.getLayoutProperty(id, "visibility") !== "none",
        ),
      HIT_LAYERS,
    );
  }

  transparentLineVisible(): Promise<boolean> {
    return this.page.evaluate(
      (layer) =>
        window.map.getLayer(layer) !== undefined && window.map.getLayoutProperty(layer, "visibility") !== "none",
      LAYERS.transparentLine,
    );
  }

  async recordVisibilityChanges() {
    await this.page.evaluate(() => {
      const map = window.map as typeof window.map & { __visibility?: string[] };
      map.__visibility = [];
      const original = map.setLayoutProperty.bind(map);
      map.setLayoutProperty = ((layerId: string, name: string, value: unknown) => {
        if (name === "visibility") map.__visibility?.push(`${layerId}=${String(value)}`);
        return original(layerId, name, value);
      }) as unknown as typeof map.setLayoutProperty;
    });
  }

  hitAreaVisibilityChangeCount(): Promise<number> {
    return this.page.evaluate(
      (watched) => {
        const map = window.map as typeof window.map & { __visibility?: string[] };
        return (map.__visibility ?? []).filter((entry) => watched.some((id) => entry.startsWith(`${id}=`))).length;
      },
      [...HIT_LAYERS, LAYERS.transparentLine],
    );
  }

  private renderedAt(at: Pixel, layers: string[], radius: number): Promise<boolean> {
    return this.page.evaluate(
      ({ target, ids, r }) => {
        const present = ids.filter((id) => window.map.getLayer(id));
        if (present.length === 0) return false;

        const box = window.map.getContainer().getBoundingClientRect();
        const x = target.x - box.left;
        const y = target.y - box.top;

        return (
          window.map.queryRenderedFeatures(
            [
              [x - r, y - r],
              [x + r, y + r],
            ],
            { layers: present },
          ).length > 0
        );
      },
      { target: at, ids: layers, r: radius },
    );
  }

  private renderedAnywhere(layers: string[]): Promise<boolean> {
    return this.page.evaluate((ids) => {
      const present = ids.filter((id) => window.map.getLayer(id));
      if (present.length === 0) return false;
      return window.map.queryRenderedFeatures({ layers: present }).length > 0;
    }, layers);
  }

  private pixelsOf(steps: Step[]): Promise<Pixel[]> {
    return this.page.evaluate(
      (coordinates) => {
        const box = window.map.getContainer().getBoundingClientRect();
        return coordinates.map(([lng, lat]) => {
          const point = window.map.project({ lng, lat });
          return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
        });
      },
      steps.map((step) => [step.lng, step.lat] as [number, number]),
    );
  }

  private async largestAuxiliaryOffset(): Promise<number> {
    const steps = await this.steps();
    const pixels = await this.pixelsOf(steps);
    const wraps = steps[steps.length - 1]?.isAuxiliary === true;

    let largest = 0;
    steps.forEach((step, index) => {
      if (!step.isAuxiliary) return;
      const at = pixels[index];
      const before = pixels[index - 1];
      const after = pixels[index + 1] ?? (wraps ? pixels[0] : undefined);
      if (!at || !before || !after) {
        largest = Number.POSITIVE_INFINITY;
        return;
      }
      const offset = Math.hypot(at.x - (before.x + after.x) / 2, at.y - (before.y + after.y) / 2);
      largest = Math.max(largest, offset);
    });

    return Math.round(largest);
  }
}

function segmentsOf(path: Pixel[]): [Pixel, Pixel][] {
  return path.slice(1).map((end, index) => [path[index]!, end]);
}

function distanceToSegment(at: Pixel, a: Pixel, b: Pixel): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSquared = abx * abx + aby * aby;
  const t =
    lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((at.x - a.x) * abx + (at.y - a.y) * aby) / lengthSquared));
  return Math.hypot(at.x - (a.x + abx * t), at.y - (a.y + aby * t));
}

function channelDistance(pixel: [number, number, number], rgb: [number, number, number]): number {
  return Math.max(Math.abs(pixel[0] - rgb[0]), Math.abs(pixel[1] - rgb[1]), Math.abs(pixel[2] - rgb[2]));
}
