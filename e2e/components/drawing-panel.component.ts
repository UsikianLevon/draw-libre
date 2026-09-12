import { expect, type Locator, type Page } from "@playwright/test";

import type { Pixel } from "../support/layout";

export class DrawingPanel {
  readonly container: Locator;
  readonly root: Locator;
  readonly undo: Locator;
  readonly redo: Locator;
  readonly delete: Locator;
  readonly save: Locator;

  constructor(page: Page) {
    this.container = page.locator(".mdl-dashboard-container");
    this.root = page.locator(".mdl-dashboard");
    this.undo = this.root.locator('[data-type="undo"]');
    this.redo = this.root.locator('[data-type="redo"]');
    this.delete = this.root.locator('[data-type="delete"]');
    this.save = this.root.locator('[data-type="save"]');
  }

  async clickUndo() {
    await this.undo.click();
  }

  async clickRedo() {
    await this.redo.click();
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

  async expectOutOfReach() {
    await expect(this.container).toHaveCSS("opacity", "0");
  }
}

async function centreOf(button: Locator): Promise<Pixel> {
  const box = await button.boundingBox();
  expect(box, "the panel button has no box, so it is not on screen").not.toBeNull();

  return { x: Math.round(box!.x + box!.width / 2), y: Math.round(box!.y + box!.height / 2) };
}
