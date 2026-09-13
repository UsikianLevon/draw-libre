import { expect, test, vi } from "vitest";

import { coalesceToFrame, type FrameCoalesced } from "./helpers";

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

test("several calls inside one frame collapse into one call with the last arguments", async () => {
  const fn = vi.fn();
  const coalesced = coalesceToFrame(fn);

  coalesced(1);
  coalesced(2);
  coalesced(3);
  expect(fn).not.toHaveBeenCalled();

  await nextFrame();

  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith(3);
});

test("a call after the frame flushed schedules a new frame", async () => {
  const fn = vi.fn();
  const coalesced = coalesceToFrame(fn);

  coalesced("a");
  await nextFrame();
  coalesced("b");
  await nextFrame();

  expect(fn).toHaveBeenCalledTimes(2);
  expect(fn).toHaveBeenLastCalledWith("b");
});

test("a call made while the frame flushes lands in the next frame instead of being lost", async () => {
  const fn = vi.fn();
  const coalesced: FrameCoalesced<(n: number) => void> = coalesceToFrame((n: number) => {
    fn(n);
    if (n === 1) coalesced(2);
  });

  coalesced(1);
  await nextFrame();
  expect(fn).toHaveBeenCalledTimes(1);

  await nextFrame();
  expect(fn).toHaveBeenCalledTimes(2);
  expect(fn).toHaveBeenLastCalledWith(2);
});

test("cancel drops the pending call", async () => {
  const fn = vi.fn();
  const coalesced = coalesceToFrame(fn);

  coalesced(1);
  coalesced.cancel();
  await nextFrame();

  expect(fn).not.toHaveBeenCalled();
});

test("cancel does not break later calls", async () => {
  const fn = vi.fn();
  const coalesced = coalesceToFrame(fn);

  coalesced(1);
  coalesced.cancel();
  coalesced(2);
  await nextFrame();

  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith(2);
});

test("cancel without a pending call is a no-op", () => {
  const coalesced = coalesceToFrame(vi.fn());

  expect(() => coalesced.cancel()).not.toThrow();
});
