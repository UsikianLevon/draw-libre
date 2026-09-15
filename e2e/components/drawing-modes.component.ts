import { expect, type Locator, type Page } from "@playwright/test";

import { expectButtonOrder } from "./button-order";
import { stableBox } from "../support/stable-box";

const TOP_LEFT_CORNER_PX = 12;

export type ModeButton = "line" | "polygon" | "break";

export class DrawingModes {
  readonly line: Locator;
  readonly polygon: Locator;
  readonly break: Locator;
  private readonly all: Locator;

  constructor(page: Page) {
    this.line = page.locator('button[data-type="line"]');
    this.polygon = page.locator('button[data-type="polygon"]');
    this.break = page.locator('button[data-type="break"]');
    this.all = page.locator('button[data-type="line"], button[data-type="polygon"], button[data-type="break"]');
  }

  async chooseLine() {
    await this.line.click();
  }

  async choosePolygon() {
    await this.polygon.click();
  }

  async chooseBreak() {
    await this.break.click();
  }

  async expectLineActive() {
    await expect(this.line).toHaveAttribute("aria-pressed", "true");
  }

  async expectPolygonActive() {
    await expect(this.polygon).toHaveAttribute("aria-pressed", "true");
  }

  async expectBreakActive() {
    await expect(this.break).toHaveAttribute("aria-pressed", "true");
  }

  async expectBreakInactive() {
    await expect(this.break).toHaveAttribute("aria-pressed", "false");
  }

  async expectLineInactive() {
    await expect(this.line).toHaveAttribute("aria-pressed", "false");
  }

  async expectPolygonInactive() {
    await expect(this.polygon).toHaveAttribute("aria-pressed", "false");
  }

  async expectButtons(types: ModeButton[]) {
    await expectButtonOrder(this.all, types);
  }

  async expectLabelled(type: ModeButton, text: string) {
    await expect(this[type]).toHaveAttribute("aria-label", text);
  }

  async hover(type: ModeButton) {
    await this[type].hover();
  }

  async tap(type: ModeButton) {
    await this[type].tap();
  }

  async forceClick(type: ModeButton) {
    await this[type].click({ force: true });
  }

  async expectInTopLeftCorner() {
    const box = await stableBox(this.line, "line mode button");
    expect(box.x, "distance of the line mode button from the left edge").toBeGreaterThanOrEqual(0);
    expect(box.y, "distance of the line mode button from the top edge").toBeGreaterThanOrEqual(0);
    expect(box.x, "distance of the line mode button from the left edge").toBeLessThanOrEqual(TOP_LEFT_CORNER_PX);
    expect(box.y, "distance of the line mode button from the top edge").toBeLessThanOrEqual(TOP_LEFT_CORNER_PX);
  }

  async expectLineEnabled() {
    await expect(this.line).toBeEnabled();
  }

  async expectLineDisabled() {
    await expect(this.line).toBeDisabled();
  }

  async expectPolygonEnabled() {
    await expect(this.polygon).toBeEnabled();
  }

  async expectPolygonDisabled() {
    await expect(this.polygon).toBeDisabled();
  }

  async expectBreakEnabled() {
    await expect(this.break).toBeEnabled();
  }

  async expectBreakDisabled() {
    await expect(this.break).toBeDisabled();
  }

  async expectNoneActive() {
    for (const button of [this.line, this.polygon, this.break]) {
      if ((await button.count()) === 0) continue;
      await expect(button).toHaveAttribute("aria-pressed", "false");
    }
  }
}
