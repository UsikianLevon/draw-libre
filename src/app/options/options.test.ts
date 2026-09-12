import { expect, test } from "vitest";

import { ELAYERS, generateLayers } from "#app/utils/geo_constants";

import { initOptions } from "./index";
import { DEFAULT_OPTIONS } from "./constants";

const paintOf = (options: Parameters<typeof generateLayers>[0], id: string) =>
  generateLayers(options).find((layer) => layer.id === id)?.paint as Record<string, unknown>;

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
