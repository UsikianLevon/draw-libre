/// <reference types="vitest/browser" />
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import type { RequiredDrawOptions, Step, StepId } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";

import { RemoveButton } from "./index";

const LABEL = "Remove point";
const CONTAINER_WIDTH = 600;
const CONTAINER_HEIGHT = 400;

type Handler = (...args: unknown[]) => void;
type Projection = (lngLat: { lng: number; lat: number }) => { x: number; y: number };

const identityProjection: Projection = (lngLat) => ({ x: lngLat.lng, y: lngLat.lat });

interface MapStub {
  map: UnifiedMap;
  container: HTMLElement;
  canvas: HTMLElement;
  handlers: Map<string, Set<Handler>>;
  emit: (type: string, payload?: unknown) => void;
  setProjection: (projection: Projection) => void;
}

function createMapStub(): MapStub {
  const container = document.createElement("div");
  container.style.cssText = `position:relative;width:${CONTAINER_WIDTH}px;height:${CONTAINER_HEIGHT}px`;
  document.body.appendChild(container);

  const canvas = document.createElement("div");
  canvas.style.cssText = "position:absolute;inset:0";
  container.appendChild(canvas);

  const handlers = new Map<string, Set<Handler>>();
  let projection = identityProjection;

  const map = {
    getContainer: () => container,
    getCanvasContainer: () => canvas,
    project: (lngLat: { lng: number; lat: number }) => projection(lngLat),
    on: (type: string, handler: Handler) => {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(handler);
    },
    off: (type: string, handler: Handler) => {
      handlers.get(type)?.delete(handler);
    },
  } as unknown as UnifiedMap;

  return {
    map,
    container,
    canvas,
    handlers,
    emit: (type: string, payload?: unknown) => handlers.get(type)?.forEach((handler) => handler(payload)),
    setProjection: (next: Projection) => {
      projection = next;
    },
  };
}

function createOptions(): RequiredDrawOptions {
  return { locale: { removePoint: LABEL } } as unknown as RequiredDrawOptions;
}

function createStep(overrides: Partial<Step> = {}): Step {
  return { id: "point-1", lat: 120, lng: 200, ...overrides };
}

let stub: MapStub;
let parking: HTMLElement;
let onRemove: (id: StepId) => void;
let button: RemoveButton;

const element = () => stub.container.querySelector<HTMLButtonElement>(".mdl-point-remove")!;
const locator = () => page.elementLocator(element());
const box = () => element().getBoundingClientRect();

beforeEach(async () => {
  stub = createMapStub();

  parking = document.createElement("div");
  parking.style.cssText = "position:fixed;right:0;bottom:0;width:40px;height:40px";
  document.body.appendChild(parking);
  await userEvent.hover(page.elementLocator(parking));

  onRemove = vi.fn();
  button = new RemoveButton({ map: stub.map, options: createOptions(), onRemove });
});

afterEach(() => {
  button.destroy();
  stub.container.remove();
  parking.remove();
});

test("the button starts out of sight and is labelled from the locale", async () => {
  await expect.element(locator()).not.toBeVisible();
  await expect.element(locator()).toHaveAttribute("aria-label", LABEL);
});

test("show puts the button beside the point", async () => {
  const step = createStep();
  button.show(step);

  await expect.element(locator()).toBeVisible();

  const anchor = stub.container.getBoundingClientRect();
  expect(box().left - anchor.left).toBeGreaterThan(step.lng);
  expect(Math.round(box().top + box().height / 2 - anchor.top)).toBe(step.lat);
});

test("show flips the button to the other side when it would overflow the container", async () => {
  const step = createStep({ lng: CONTAINER_WIDTH - 6 });
  button.show(step);

  await expect.element(locator()).toBeVisible();

  const anchor = stub.container.getBoundingClientRect();
  expect(box().right - anchor.left).toBeLessThanOrEqual(step.lng);
});

test("the button reaches back toward its point so the gap is never bare", () => {
  const step = createStep();
  button.show(step);

  const anchor = stub.container.getBoundingClientRect();
  const y = anchor.top + step.lat;

  for (const x of [step.lng + 8, step.lng + 10]) {
    expect(document.elementFromPoint(anchor.left + x, y)).toBe(element());
  }
});

test("moving the cursor off the button hides it at once", async () => {
  button.show(createStep());

  await userEvent.hover(locator());
  await userEvent.unhover(locator());

  expect(element().classList.contains("hidden")).toBe(true);
});

test("a real click removes the anchored point and hides the button", async () => {
  button.show(createStep({ id: "point-42" }));

  await userEvent.click(locator());

  expect(onRemove).toHaveBeenCalledTimes(1);
  expect(onRemove).toHaveBeenCalledWith("point-42");
  await expect.element(locator()).not.toBeVisible();
});

test("a real press on the map dismisses the button", async () => {
  button.show(createStep());

  await userEvent.click(page.elementLocator(stub.canvas));

  await expect.element(locator()).not.toBeVisible();
});

test("the button follows a point that moves under it", async () => {
  const step = createStep();
  button.show(step);
  const before = box().left;

  step.lng += 40;
  stub.emit("move");

  await vi.waitFor(() => {
    expect(box().left).toBe(before + 40);
  });
});

test("the button follows its point while the map moves", async () => {
  const step = createStep();
  button.show(step);
  const before = box().left;

  stub.setProjection((lngLat) => ({ x: lngLat.lng + 60, y: lngLat.lat + 40 }));
  stub.emit("move");

  await vi.waitFor(() => {
    expect(box().left).toBe(before + 60);
  });
});

test("map listeners only live while the button is on screen", async () => {
  const listeners = (type: string) => stub.handlers.get(type)?.size ?? 0;

  expect(listeners("move")).toBe(0);

  button.show(createStep());
  expect(listeners("move")).toBe(1);
  expect(listeners("zoom")).toBe(1);

  button.hide();
  expect(listeners("move")).toBe(0);
  expect(listeners("zoom")).toBe(0);
});

test("destroy leaves the map with no listeners at all", () => {
  button.show(createStep());
  button.destroy();

  for (const type of ["move", "zoom"]) {
    expect(stub.handlers.get(type)?.size ?? 0).toBe(0);
  }
});

test("destroy takes the button out of the container and can be called twice", () => {
  button.destroy();

  expect(stub.container.querySelector(".mdl-point-remove")).toBeNull();
  expect(() => button.destroy()).not.toThrow();
});
