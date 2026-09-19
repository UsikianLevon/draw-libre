import { afterEach, expect, test, vi } from "vitest";
import { latest, normalizePropertyExpression } from "@maplibre/maplibre-gl-style-spec";

import { ELAYERS, POINTS_FILTER, generateLayers } from "#app/utils/geo_constants";

import { initOptions, checkInitialStepsOptionOnErrors } from "./index";
import { DEFAULT_OPTIONS, interactionDefaults } from "./constants";
import { ERRORS } from "#app/store/init";

const paintOf = (options: Parameters<typeof generateLayers>[0], id: string) =>
  generateLayers(options).find((layer) => layer.id === id)?.paint as Record<string, unknown>;

const haloOpacity = (options: Parameters<typeof generateLayers>[0], hovered: boolean) => {
  const opacity = paintOf(options, ELAYERS.PointsHaloLayer)["circle-opacity"];
  const expression = normalizePropertyExpression(
    opacity as never,
    "circle-opacity",
    latest.paint_circle["circle-opacity"] as never,
  );

  return expression.evaluate({ zoom: 0 } as never, { type: 1, properties: {} } as never, { hover: hovered });
};

const stubHover = (canHover: boolean) =>
  vi
    .spyOn(window, "matchMedia")
    .mockImplementation((query) => ({ matches: !canHover && query === "(hover: none)" }) as MediaQueryList);

afterEach(() => {
  vi.restoreAllMocks();
});

test("a device without hover gets no dynamic line even when the option asks for it", () => {
  stubHover(false);

  expect(initOptions().dynamicLine).toBe(false);
  expect(initOptions({ dynamicLine: true }).dynamicLine).toBe(false);
});

test("a device with hover keeps the dynamic line unless the option turns it off", () => {
  stubHover(true);

  expect(initOptions().dynamicLine).toBe(true);
  expect(initOptions({}).dynamicLine).toBe(true);
  expect(initOptions({ dynamicLine: false }).dynamicLine).toBe(false);
});

test("the panel buttons stay hidden unless each one is turned on", () => {
  const visibility = (options: ReturnType<typeof initOptions>) =>
    Object.values(options.panel.buttons).map((button) => button.visible);

  expect(visibility(initOptions())).toEqual([false, false, false, false]);
  expect(visibility(initOptions({}))).toEqual([false, false, false, false]);
  expect(visibility(initOptions({ panel: { size: "large" } }))).toEqual([false, false, false, false]);
  expect(visibility(initOptions({ panel: { buttons: { save: { visible: true } } } }))).toEqual([
    false,
    false,
    false,
    true,
  ]);

  const shown = initOptions({
    panel: {
      buttons: {
        delete: { visible: true },
        redo: { visible: true },
        undo: { visible: true },
        save: { clearOnSave: true, visible: true },
      },
    },
  });
  expect(visibility(shown)).toEqual([true, true, true, true]);
  expect(shown.panel.buttons.save.clearOnSave).toBe(true);
});

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

test("auxiliary points get a hit halo smaller than regular points, since they are drawn smaller", () => {
  const auxiliary = paintOf(DEFAULT_OPTIONS, ELAYERS.AuxiliaryPointHitLayer);
  const regular = paintOf(DEFAULT_OPTIONS, ELAYERS.PointsHitLayer);

  expect(auxiliary["circle-radius"]).toBe(11.5);
  expect(auxiliary["circle-radius"]).toBeLessThan(regular["circle-radius"] as number);
  expect(auxiliary["circle-opacity"]).toEqual(regular["circle-opacity"]);
  expect(paintOf(DEFAULT_OPTIONS, ELAYERS.AuxiliaryPointHaloLayer)["circle-radius"]).toBe(11.5);
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

test("layer filters are written in expression syntax only", () => {
  const filters = [
    ...generateLayers(DEFAULT_OPTIONS).map((layer) => ("filter" in layer ? layer.filter : null)),
    ...Object.values(POINTS_FILTER),
  ];

  expect(JSON.stringify(filters)).not.toMatch(/\["==","(\$type|isFirst|isAuxiliary)"/);
});

test("initial options with an empty step list are refused by the options check", () => {
  expect(() =>
    checkInitialStepsOptionOnErrors({ geometry: "line", closeGeometry: false, generateId: true, steps: [] }),
  ).toThrow(ERRORS.EMPTY_INITIAL_STATE);
});

test("initial options with steps pass the empty check", () => {
  expect(() =>
    checkInitialStepsOptionOnErrors({
      geometry: "line",
      closeGeometry: false,
      generateId: true,
      steps: [{ lat: 1, lng: 2 }],
    }),
  ).not.toThrow();
});

const layoutOf = (options: Parameters<typeof generateLayers>[0], id: string) =>
  generateLayers(options).find((layer) => layer.id === id)?.layout as Record<string, unknown> | undefined;

test("without layout options every layer keeps the layout it had before", () => {
  const layouts = Object.fromEntries(generateLayers(initOptions({})).map((layer) => [layer.id, layer.layout]));

  expect(layouts).toEqual({
    [ELAYERS.SinglePointLayer]: { visibility: "none" },
    [ELAYERS.PolygonLayer]: { visibility: "none" },
    [ELAYERS.LineDynamicLayer]: { visibility: "none" },
    [ELAYERS.LineLayer]: { visibility: "visible" },
    [ELAYERS.LineLayerTransparent]: undefined,
    [ELAYERS.LineLayerBreak]: { visibility: "none" },
    [ELAYERS.PointsLayer]: {},
    [ELAYERS.FirstPointLayer]: { visibility: "none" },
    [ELAYERS.AuxiliaryPointLayer]: {},
    [ELAYERS.PointsHitLayer]: undefined,
    [ELAYERS.FirstPointHitLayer]: { visibility: "none" },
    [ELAYERS.AuxiliaryPointHitLayer]: undefined,
    [ELAYERS.PointsHaloLayer]: undefined,
    [ELAYERS.FirstPointHaloLayer]: { visibility: "none" },
    [ELAYERS.AuxiliaryPointHaloLayer]: undefined,
  });
  expect(generateLayers(initOptions())).toEqual(generateLayers(initOptions({})));
});

test("a line layout reaches the line and the dynamic line but not the hit layer", () => {
  const options = initOptions({ layersLayout: { line: { "line-join": "round", "line-cap": "round" } } });

  expect(layoutOf(options, ELAYERS.LineLayer)).toEqual({
    "line-join": "round",
    "line-cap": "round",
    visibility: "visible",
  });
  expect(layoutOf(options, ELAYERS.LineDynamicLayer)).toEqual({
    "line-join": "round",
    "line-cap": "round",
    visibility: "none",
  });
  expect(layoutOf(options, ELAYERS.LineLayerTransparent)).toBeUndefined();
  expect(layoutOf(options, ELAYERS.LineLayerBreak)).toEqual({ visibility: "none" });
});

test("an explicit dynamicLine layout wins over the inherited one", () => {
  const options = initOptions({
    layersLayout: { line: { "line-join": "round" }, dynamicLine: { "line-join": "bevel" } },
  });

  expect(layoutOf(options, ELAYERS.LineDynamicLayer)?.["line-join"]).toBe("bevel");
});

test("a visibility passed without types is dropped and the library one stays", () => {
  const options = initOptions({
    layersLayout: {
      line: { visibility: "none", "line-join": "round" },
      polygon: { visibility: "visible" },
      points: { visibility: "none" },
    },
  } as never);

  expect(options.layersLayout.line).toEqual({ "line-join": "round" });
  expect(layoutOf(options, ELAYERS.LineLayer)?.visibility).toBe("visible");
  expect(layoutOf(options, ELAYERS.PolygonLayer)?.visibility).toBe("none");
  expect(layoutOf(options, ELAYERS.PointsLayer)).toEqual({});
});

test("the closable first point is one pixel bigger with a red ring unless configured", () => {
  expect(DEFAULT_OPTIONS.layersPaint.firstPointClosable).toEqual({
    "circle-radius": 6.5,
    "circle-stroke-color": "#FF6464",
  });
  expect(initOptions({}).layersPaint.firstPointClosable).toEqual(DEFAULT_OPTIONS.layersPaint.firstPointClosable);
  expect(initOptions({ layersPaint: { firstPoint: { "circle-radius": 10 } } }).layersPaint.firstPointClosable).toEqual({
    "circle-radius": 11,
    "circle-stroke-color": "#FF6464",
  });
});

test("a first point radius given as an expression is kept as is by the closable state", () => {
  const radius = ["+", 5, 5];
  const options = initOptions({ layersPaint: { firstPoint: { "circle-radius": radius } } });

  expect(options.layersPaint.firstPointClosable?.["circle-radius"]).toEqual(radius);
});

test("configured closable keys win over the defaults", () => {
  const options = initOptions({
    layersPaint: { firstPointClosable: { "circle-stroke-color": "#0000FF", "circle-color": "#00FF00" } },
  });

  expect(options.layersPaint.firstPointClosable).toEqual({
    "circle-radius": 6.5,
    "circle-stroke-color": "#0000FF",
    "circle-color": "#00FF00",
  });
});

test("without halo options the halo looks as before and matches the hit area of every point kind", () => {
  for (const options of [DEFAULT_OPTIONS, initOptions({})]) {
    for (const [halo, hit] of [
      [ELAYERS.PointsHaloLayer, ELAYERS.PointsHitLayer],
      [ELAYERS.FirstPointHaloLayer, ELAYERS.FirstPointHitLayer],
      [ELAYERS.AuxiliaryPointHaloLayer, ELAYERS.AuxiliaryPointHitLayer],
    ] as const) {
      const paint = paintOf(options, halo);
      expect(paint["circle-color"]).toBe("#666666");
      expect(paint["circle-radius"]).toBe(paintOf(options, hit)["circle-radius"]);
      expect(paint["circle-pitch-scale"]).toBe("viewport");
    }
  }
  expect(haloOpacity(DEFAULT_OPTIONS, true)).toBe(0.18);
});

test("hit layers stay invisible whether or not the point is hovered", () => {
  for (const id of [ELAYERS.PointsHitLayer, ELAYERS.FirstPointHitLayer, ELAYERS.AuxiliaryPointHitLayer]) {
    expect(paintOf(DEFAULT_OPTIONS, id)["circle-opacity"]).toBe(0);
  }
});

test("a configured halo changes color, radius and hover opacity but not the hit area", () => {
  const options = initOptions({
    layersPaint: { pointHalo: { "circle-color": "#2563EB", "circle-radius": 18, "circle-opacity": 0.3 } },
  });

  expect(paintOf(options, ELAYERS.PointsHaloLayer)["circle-color"]).toBe("#2563EB");
  expect(paintOf(options, ELAYERS.PointsHaloLayer)["circle-radius"]).toBe(18);
  expect(paintOf(options, ELAYERS.FirstPointHaloLayer)["circle-radius"]).toBe(18);
  expect(paintOf(options, ELAYERS.AuxiliaryPointHaloLayer)["circle-radius"]).toBe(15.5);
  expect(haloOpacity(options, true)).toBe(0.3);
  expect(haloOpacity(options, false)).toBe(0);

  expect(paintOf(options, ELAYERS.PointsHitLayer)["circle-radius"]).toBe(14);
  expect(paintOf(options, ELAYERS.AuxiliaryPointHitLayer)["circle-radius"]).toBe(11.5);
});

test("a tiny halo radius never makes the auxiliary halo negative", () => {
  const options = initOptions({ layersPaint: { pointHalo: { "circle-radius": 1 } } });

  expect(paintOf(options, ELAYERS.AuxiliaryPointHaloLayer)["circle-radius"]).toBe(0);
});
