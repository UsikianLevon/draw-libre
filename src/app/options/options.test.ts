import { expect, test } from "vitest";
import { latest, normalizePropertyExpression } from "@maplibre/maplibre-gl-style-spec";

import { ELAYERS, generateLayers } from "#app/utils/geo_constants";

import { initOptions } from "./index";
import { DEFAULT_OPTIONS, interactionDefaults } from "./constants";

const paintOf = (options: Parameters<typeof generateLayers>[0], id: string) =>
  generateLayers(options).find((layer) => layer.id === id)?.paint as Record<string, unknown>;

const haloOpacity = (options: Parameters<typeof generateLayers>[0], hovered: boolean) => {
  const opacity = paintOf(options, ELAYERS.PointsHitLayer)["circle-opacity"];
  const expression = normalizePropertyExpression(opacity as never, latest.paint_circle["circle-opacity"] as never);

  return expression.evaluate({ zoom: 0 } as never, { type: 1, properties: {} } as never, { hover: hovered });
};

test("dynamic line layer is dashed by default", () => {
  const paint = paintOf(DEFAULT_OPTIONS, ELAYERS.LineDynamicLayer);

  expect(paint["line-dasharray"]).toEqual([4.5, 2.5]);
});

test("static line layer stays solid", () => {
  const paint = paintOf(DEFAULT_OPTIONS, ELAYERS.LineLayer);

  expect(paint["line-dasharray"]).toBeUndefined();
});

test("dynamic line follows a custom line paint and stays dashed", () => {
  const options = initOptions({ layersPaint: { line: { "line-color": "#FF0000", "line-width": 8 } } });

  const dynamic = paintOf(options, ELAYERS.LineDynamicLayer);
  const line = paintOf(options, ELAYERS.LineLayer);

  expect(dynamic["line-color"]).toBe("#FF0000");
  expect(dynamic["line-width"]).toBe(8);
  expect(dynamic["line-dasharray"]).toEqual([4.5, 2.5]);
  expect(line["line-dasharray"]).toBeUndefined();
});

test("an explicit dynamicLine paint wins over the inherited one", () => {
  const options = initOptions({
    layersPaint: {
      line: { "line-color": "#FF0000" },
      dynamicLine: { "line-color": "#00FF00", "line-dasharray": [1, 1] },
    },
  });

  const dynamic = paintOf(options, ELAYERS.LineDynamicLayer);

  expect(dynamic["line-color"]).toBe("#00FF00");
  expect(dynamic["line-dasharray"]).toEqual([1, 1]);
});

test("the line hit layer is far wider than the line the user sees", () => {
  const hit = paintOf(DEFAULT_OPTIONS, ELAYERS.LineLayerTransparent);
  const visible = paintOf(DEFAULT_OPTIONS, ELAYERS.LineLayer);

  expect(hit["line-width"]).toBe(14);
  expect(visible["line-width"]).toBe(3);
});

test("points get a hit layer wider than the circle the user sees", () => {
  const hit = paintOf(DEFAULT_OPTIONS, ELAYERS.PointsHitLayer);
  const drawn = paintOf(DEFAULT_OPTIONS, ELAYERS.PointsLayer);

  expect(hit["circle-radius"]).toBe(14);
  expect(drawn["circle-radius"]).toBe(5.5);
});

test("a user paint override cannot shrink the point hit area", () => {
  const options = initOptions({ layersPaint: { points: { "circle-radius": 1, "circle-stroke-width": 0 } } });

  expect(paintOf(options, ELAYERS.PointsHitLayer)["circle-radius"]).toBe(14);
});

test("coarse pointers get larger hit areas than mice", () => {
  expect(interactionDefaults(false)).toEqual({ lineHitRadius: 7, pointHitRadius: 14 });
  expect(interactionDefaults(true)).toEqual({ lineHitRadius: 12, pointHitRadius: 20 });
});

test("the halo lights up only while its point is hovered", () => {
  expect(haloOpacity(DEFAULT_OPTIONS, false)).toBe(0);
  expect(haloOpacity(DEFAULT_OPTIONS, true)).toBeGreaterThan(0);
});
