import { expect, type Locator, type Page } from "@playwright/test";

import type { Pixel } from "../support/layout";
import { stableBox, type Box } from "../support/stable-box";
import { expectButtonOrder } from "./button-order";

const TRIAL_CLICK_TIMEOUT_MS = 500;
const ABOVE_TOLERANCE_PX = 1.5;

export type PanelButton = "undo" | "redo" | "delete" | "save";

export class DrawingPanel {
  readonly root: Locator;
  readonly undo: Locator;
  readonly redo: Locator;
  readonly delete: Locator;
  readonly save: Locator;

  constructor(page: Page) {
    this.root = page.locator('[data-type="panel"]');
    this.undo = this.root.locator('button[data-type="undo"]');
    this.redo = this.root.locator('button[data-type="redo"]');
    this.delete = this.root.locator('button[data-type="delete"]');
    this.save = this.root.locator('button[data-type="save"]');
  }

  async clickUndo() {
    await this.undo.click();
  }

  async clickRedo() {
    await this.redo.click();
  }

  async clickSave() {
    await this.save.click();
  }

  async clickDelete() {
    await this.delete.click();
  }

  async tapUndo() {
    await this.undo.tap();
  }

  async tapDelete() {
    await this.delete.tap();
  }

  async centreOfUndo(): Promise<Pixel> {
    return centreOf(this.undo);
  }

  async centreOfRedo(): Promise<Pixel> {
    return centreOf(this.redo);
  }

  async expectUndoEnabled() {
    await expect(this.undo).toBeEnabled();
  }

  async expectUndoDisabled() {
    await expect(this.undo).toBeDisabled();
  }

  async expectRedoEnabled() {
    await expect(this.redo).toBeEnabled();
  }

  async expectRedoDisabled() {
    await expect(this.redo).toBeDisabled();
  }

  async expectNoButton(type: PanelButton) {
    await expect(this.button(type)).toHaveCount(0);
  }

  async expectVisible() {
    await expect(this.root).toBeVisible();
    await expect(this.root).not.toHaveAttribute("aria-hidden", "true");
  }

  async expectHidden() {
    if ((await this.root.count()) === 0) return;

    await expect(this.root).toHaveAttribute("aria-hidden", "true");
    await expect(this.root).toHaveCSS("opacity", "0");
    await expect(this.root.click({ trial: true, timeout: TRIAL_CLICK_TIMEOUT_MS })).rejects.toThrow();
  }

  button(type: PanelButton): Locator {
    return this.root.locator(`button[data-type="${type}"]`);
  }

  async hover(type: PanelButton) {
    await this.button(type).hover();
  }

  box(): Promise<Box> {
    return stableBox(this.root, "panel");
  }

  async expectAbove(at: Pixel) {
    await expect
      .poll(async () => {
        const box = await this.box();
        return Math.abs(box.x + box.width / 2 - at.x);
      })
      .toBeLessThanOrEqual(ABOVE_TOLERANCE_PX);
    const box = await this.box();
    expect(box.y + box.height).toBeLessThan(at.y);
  }

  async expectButtons(types: PanelButton[]) {
    await expectButtonOrder(this.root.locator("button"), types);
  }

  async expectButtonSize(px: number) {
    const buttons = this.root.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const box = await stableBox(buttons.nth(index), "panel button");
      expect(Math.round(box.width)).toBe(px);
      expect(Math.round(box.height)).toBe(px);
    }
  }

  async expectLabelled(type: PanelButton, text: string) {
    await expect(this.button(type)).toHaveAttribute("aria-label", text);
  }
}

async function centreOf(button: Locator): Promise<Pixel> {
  const box = await stableBox(button, "panel button");
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
}
