import { expect, test } from "vitest";

import type { UnifiedMap } from "#app/types/map";
import { ELAYERS } from "#app/utils/geo_constants";

import { DragLayers } from "./drag-layers";

type Visibility = "visible" | "none" | undefined;

const DRAG_LAYERS = [
  ELAYERS.LineLayerTransparent,
  ELAYERS.PointsHitLayer,
  ELAYERS.FirstPointHitLayer,
  ELAYERS.AuxiliaryPointHitLayer,
];

function createMapStub(initial: Partial<Record<string, Visibility>>) {
  const visibility: Record<string, Visibility> = { ...initial };
  const writes: string[] = [];

  const map = {
    getLayer: (id: string) => (id in visibility ? { id } : undefined),
    getLayoutProperty: (id: string) => visibility[id],
    setLayoutProperty: (id: string, _name: string, value: Visibility) => {
      visibility[id] = value;
      writes.push(`${id}=${value}`);
    },
  } as unknown as UnifiedMap;

  return { map, visibility, writes };
}

function allLayers(overrides: Partial<Record<string, Visibility>> = {}) {
  const initial: Partial<Record<string, Visibility>> = {};
  for (const id of DRAG_LAYERS) initial[id] = undefined;
  return { ...initial, ...overrides };
}

const PRESS = { x: 100, y: 100 };

test("a nudge inside the click tolerance leaves every layer alone", () => {
  const stub = createMapStub(allLayers());
  const layers = new DragLayers(stub.map);

  layers.press(PRESS);
  layers.move({ x: 102, y: 102 });

  expect(stub.writes).toEqual([]);
});

test("a move of exactly the click tolerance still counts as a click", () => {
  const stub = createMapStub(allLayers());
  const layers = new DragLayers(stub.map);

  layers.press(PRESS);
  layers.move({ x: 103, y: 100 });

  expect(stub.writes).toEqual([]);
});

test("moving past the click tolerance hides the hit layers and the transparent line", () => {
  const stub = createMapStub(allLayers());
  const layers = new DragLayers(stub.map);

  layers.press(PRESS);
  layers.move({ x: 104, y: 100 });

  for (const id of DRAG_LAYERS) {
    expect(stub.visibility[id]).toBe("none");
  }
});

test("the layers hide only once per press", () => {
  const stub = createMapStub(allLayers());
  const layers = new DragLayers(stub.map);

  layers.press(PRESS);
  layers.move({ x: 110, y: 100 });
  layers.move({ x: 120, y: 100 });

  expect(stub.writes).toHaveLength(DRAG_LAYERS.length);
});

test("release puts back what each layer had before the drag", () => {
  const stub = createMapStub(allLayers({ [ELAYERS.FirstPointHitLayer]: "none" }));
  const layers = new DragLayers(stub.map);

  layers.press(PRESS);
  layers.move({ x: 110, y: 100 });
  layers.release();

  expect(stub.visibility[ELAYERS.PointsHitLayer]).toBe("visible");
  expect(stub.visibility[ELAYERS.AuxiliaryPointHitLayer]).toBe("visible");
  expect(stub.visibility[ELAYERS.LineLayerTransparent]).toBe("visible");
  expect(stub.visibility[ELAYERS.FirstPointHitLayer]).toBe("none");
});

test("release without a prior hide writes nothing", () => {
  const stub = createMapStub(allLayers());
  const layers = new DragLayers(stub.map);

  layers.press(PRESS);
  layers.release();

  expect(stub.writes).toEqual([]);
});

test("a move without a press does nothing", () => {
  const stub = createMapStub(allLayers());
  const layers = new DragLayers(stub.map);

  layers.move({ x: 200, y: 200 });

  expect(stub.writes).toEqual([]);
});

test("layers missing from the map are skipped", () => {
  const stub = createMapStub({ [ELAYERS.PointsHitLayer]: undefined });
  const layers = new DragLayers(stub.map);

  layers.press(PRESS);
  layers.move({ x: 110, y: 100 });
  layers.release();

  expect(stub.writes).toEqual([`${ELAYERS.PointsHitLayer}=none`, `${ELAYERS.PointsHitLayer}=visible`]);
});
