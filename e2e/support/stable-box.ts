import { expect, type Locator } from "@playwright/test";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FRAMES_BETWEEN_READS = 2;
const MAX_ROUNDS = 30;

export async function stableBox(locator: Locator, label = "element"): Promise<Box> {
  await expect(locator).toBeVisible();
  let previous = await locator.boundingBox();

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    await waitFrames(locator, FRAMES_BETWEEN_READS);
    const current = await locator.boundingBox();
    if (previous && current && sameBox(previous, current)) return current;
    previous = current;
  }

  throw new Error(`the ${label} kept moving for ${MAX_ROUNDS} rounds`);
}

function waitFrames(locator: Locator, frames: number): Promise<void> {
  return locator.page().evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const tick = (left: number) => {
          if (left === 0) {
            resolve();
            return;
          }
          requestAnimationFrame(() => tick(left - 1));
        };
        tick(count);
      }),
    frames,
  );
}

function sameBox(a: Box, b: Box): boolean {
  return (
    Math.round(a.x) === Math.round(b.x) &&
    Math.round(a.y) === Math.round(b.y) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height)
  );
}
