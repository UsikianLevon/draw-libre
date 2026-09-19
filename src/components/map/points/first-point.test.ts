import { expect, test } from "vitest";

import { initOptions } from "#app/options";
import { DEFAULT_OPTIONS } from "#app/options/constants";
import type { StoreChangeEvent } from "#app/store/types";
import type { DrawOptions } from "#app/types/index";
import { ELAYERS } from "#app/utils/geo_constants";

import { FirstPoint } from "./first-point";
import type { TilesContext } from "../tiles";

type PaintWrite = [string, unknown];

function mountFirstPoint(options = DEFAULT_OPTIONS) {
  const writes: PaintWrite[] = [];
  const storeObservers: ((event: StoreChangeEvent) => void)[] = [];
  let canClose = false;

  const ctx = {
    map: {
      getLayer: () => undefined,
      on: () => {},
      off: () => {},
      setPaintProperty: (id: string, key: string, value: unknown) => {
        if (id === ELAYERS.FirstPointLayer) writes.push([key, value]);
      },
    },
    mode: { addObserver: () => {}, removeObserver: () => {} },
    store: {
      addObserver: (observer: (event: StoreChangeEvent) => void) => storeObservers.push(observer),
      removeObserver: () => {},
      circular: { canClose: () => canClose },
    },
    options,
  } as unknown as TilesContext;

  new FirstPoint(ctx, {} as ConstructorParameters<typeof FirstPoint>[1]);

  const mutate = (closable: boolean) => {
    canClose = closable;
    for (const observer of storeObservers) observer({ type: "STORE_MUTATED" } as StoreChangeEvent);
  };

  return { writes, mutate };
}

const optionsWith = (options: DrawOptions) => initOptions(options);

test("without paint options the first point grows and turns red when the line can close, and goes back after", () => {
  const { writes, mutate } = mountFirstPoint();

  mutate(true);
  expect(writes.splice(0)).toEqual([
    ["circle-radius", 6.5],
    ["circle-stroke-color", "#FF6464"],
  ]);

  mutate(false);
  expect(writes.splice(0)).toEqual([
    ["circle-radius", 5.5],
    ["circle-stroke-color", "#666666"],
  ]);
});

test("the first point paint is not touched again while the closable state stays the same", () => {
  const { writes, mutate } = mountFirstPoint();

  mutate(false);
  const firstCount = writes.length;
  mutate(false);
  mutate(false);
  expect(writes.length).toBe(firstCount);

  mutate(true);
  const afterFlip = writes.length;
  mutate(true);
  expect(writes.length).toBe(afterFlip);
});

test("a configured closable paint is applied and every key it sets goes back to the first point paint", () => {
  const options = optionsWith({
    layersPaint: {
      firstPoint: { "circle-color": "#00FF00" },
      firstPointClosable: { "circle-color": "#0000FF", "circle-blur": 0.5 },
    },
  });
  const { writes, mutate } = mountFirstPoint(options);

  mutate(true);
  expect(Object.fromEntries(writes.splice(0))).toEqual({
    "circle-radius": 6.5,
    "circle-stroke-color": "#FF6464",
    "circle-color": "#0000FF",
    "circle-blur": 0.5,
  });

  mutate(false);
  expect(Object.fromEntries(writes.splice(0))).toEqual({
    "circle-radius": 5.5,
    "circle-stroke-color": "#666666",
    "circle-color": "#00FF00",
    "circle-blur": undefined,
  });
});
