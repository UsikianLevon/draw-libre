import { expect, type Locator, type Page } from "@playwright/test";

import { stableBox } from "../support/stable-box";

const EDGE_TOLERANCE_PX = 1;
const CENTRE_TOLERANCE_PX = 2;

export class TooltipComponent {
  constructor(
    private readonly page: Page,
    private readonly settle: () => Promise<void>,
  ) {}

  async expectShowing(text: string) {
    await expect(this.label(text)).toBeVisible();
    await expect(this.label(text)).toHaveCSS("opacity", "1");
  }

  async expectNotShowing(text: string) {
    await this.settle();
    await expect(this.label(text)).toHaveCount(0);
  }

  async expectBelow(text: string, target: Locator) {
    await this.expectShowing(text);
    const label = await stableBox(this.label(text), "tooltip");
    const box = await stableBox(target, "tooltip target");

    expect(label.y).toBeGreaterThanOrEqual(box.y + box.height - EDGE_TOLERANCE_PX);
    expect(Math.abs(label.x + label.width / 2 - (box.x + box.width / 2))).toBeLessThanOrEqual(CENTRE_TOLERANCE_PX);
  }

  async expectRightOf(text: string, target: Locator) {
    await this.expectShowing(text);
    const label = await stableBox(this.label(text), "tooltip");
    const box = await stableBox(target, "tooltip target");

    const viewport = this.page.viewportSize();

    expect(label.x).toBeGreaterThanOrEqual(box.x + box.width - EDGE_TOLERANCE_PX);
    expect(viewport, "the page has no viewport size").not.toBeNull();
    expect(label.x + label.width).toBeLessThanOrEqual(viewport!.width);
    expect(label.y).toBeLessThan(box.y + box.height);
    expect(label.y + label.height).toBeGreaterThan(box.y);
  }

  async expectLeftOf(text: string, target: Locator) {
    await this.expectShowing(text);
    const label = await stableBox(this.label(text), "tooltip");
    const box = await stableBox(target, "tooltip target");

    expect(label.x + label.width).toBeLessThanOrEqual(box.x + EDGE_TOLERANCE_PX);
    expect(label.x).toBeGreaterThanOrEqual(0);
    expect(label.y).toBeLessThan(box.y + box.height);
    expect(label.y + label.height).toBeGreaterThan(box.y);
  }

  private label(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
