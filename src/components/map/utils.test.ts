import { expect, test } from "vitest";
import type { MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import type { UnifiedMap } from "#app/types/map";

import { queryPoint } from "./utils";

const PX_PER_DEGREE = 10;

const screen = (x: number, y: number) => ({ x, y }) as MapMouseEvent["point"];

type XY = { x: number; y: number } | [number, number];
type LngLat = { lng: number; lat: number } | [number, number];

const pointFeature = (id: string, lng: number, lat = 0) =>
  ({
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: { id },
  }) as unknown as MapGeoJSONFeature;

const mapReturning = (features: MapGeoJSONFeature[]) =>
  ({
    queryRenderedFeatures: () => features,
    project: (coords: LngLat) => {
      const { lng, lat } = Array.isArray(coords) ? { lng: coords[0], lat: coords[1] } : coords;
      return { x: lng * PX_PER_DEGREE, y: -lat * PX_PER_DEGREE };
    },
    unproject: (point: XY) => {
      const { x, y } = Array.isArray(point) ? { x: point[0], y: point[1] } : point;
      return { lng: x / PX_PER_DEGREE, lat: -y / PX_PER_DEGREE };
    },
  }) as unknown as UnifiedMap;

test("the nearer of two overlapping points wins whatever order they are rendered in", () => {
  const farther = pointFeature("farther", 0);
  const nearer = pointFeature("nearer", 1.2);
  const cursor = screen(9, 0);

  expect(queryPoint(mapReturning([farther, nearer]), cursor)?.properties.id).toBe("nearer");
  expect(queryPoint(mapReturning([nearer, farther]), cursor)?.properties.id).toBe("nearer");
});

test("on a repeated world copy the point nearest on screen still wins", () => {
  const nearer = pointFeature("nearer", 0);
  const farther = pointFeature("farther", 1.2);
  const cursor = screen(360 * PX_PER_DEGREE + 5, 0);

  expect(queryPoint(mapReturning([farther, nearer]), cursor)?.properties.id).toBe("nearer");
});

test("no point under the cursor gives nothing", () => {
  expect(queryPoint(mapReturning([]), screen(0, 0))).toBeUndefined();
});
