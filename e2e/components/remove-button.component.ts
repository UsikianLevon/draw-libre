import { expect, type Locator, type Page } from "@playwright/test";

import type { Pixel } from "../support/layout";
import { type Box, stableBox } from "../support/stable-box";

const CENTRING_TOLERANCE_PX = 3;

// desktop pointHitRadius 14 plus the 3px gap from the remove button component
const OFFSET_X = 17;
const OFFSET_TOLERANCE_PX = 2;

export class RemoveButtonComponent {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('button[data-type="remove-point"]');
  }

  async expectVisible() {
    await expect(this.root).toBeVisible();
  }

  async expectHidden() {
    await expect(this.root).toBeHidden();
  }

  async expectLabelled(label: string) {
    await expect(this.root).toHaveAttribute("aria-label", label);
  }

  async click() {
    await this.expectVisible();
    await this.root.click();
  }

  async tap() {
    await this.expectVisible();
    await this.root.tap();
  }

  async hover() {
    await this.expectVisible();
    await this.root.hover();
  }

  async box(): Promise<Box> {
    return stableBox(this.root, "remove button");
  }

  async centre(): Promise<Pixel> {
    const box = await this.box();
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  }

  async expectRightOf(at: Pixel) {
    const box = await this.box();
    expect(Math.abs(box.x - (at.x + OFFSET_X))).toBeLessThanOrEqual(OFFSET_TOLERANCE_PX);
  }

  async expectLeftOf(at: Pixel) {
    const box = await this.box();
    expect(Math.abs(box.x + box.width - (at.x - OFFSET_X))).toBeLessThanOrEqual(OFFSET_TOLERANCE_PX);
  }

  async expectMovedFrom(previous: Box) {
    await expect
      .poll(async () => {
        const box = await this.box();
        return Math.round(box.x) !== Math.round(previous.x) || Math.round(box.y) !== Math.round(previous.y);
      })
      .toBe(true);
  }

  async expectVerticallyCentredOn(at: Pixel) {
    const box = await this.box();
    expect(Math.abs(box.y + box.height / 2 - at.y)).toBeLessThan(CENTRING_TOLERANCE_PX);
  }
}
