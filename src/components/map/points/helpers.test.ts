import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { MapLayerMouseEvent } from "maplibre-gl";

import { PointVisibility } from "./helpers";

const recordingMap = () => {
  const visibility: string[] = [];
  const event = {
    target: { setLayoutProperty: (_layer: string, _property: string, value: string) => visibility.push(value) },
  } as unknown as MapLayerMouseEvent;

  return { visibility, event };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("showing the ghost cancels a hide that is still pending", () => {
  const { visibility, event } = recordingMap();

  PointVisibility.setSinglePointHidden(event);
  PointVisibility.setSinglePointVisible(event);
  vi.runAllTimers();

  expect(visibility).toEqual(["visible"]);
});

test("the ghost still hides when nothing shows it again", () => {
  const { visibility, event } = recordingMap();

  PointVisibility.setSinglePointHidden(event);
  vi.runAllTimers();

  expect(visibility).toEqual(["none"]);
});
