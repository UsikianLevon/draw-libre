import { expect, type Locator, type Page } from "@playwright/test";

export type DrawEventName =
  | "mdl:add"
  | "mdl:pointremove"
  | "mdl:moveend"
  | "mdl:pointenter"
  | "mdl:pointleave"
  | "mdl:undo"
  | "mdl:redo"
  | "mdl:removeall"
  | "mdl:save"
  | "mdl:modechanged";

export class EventLog {
  private readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator("#event-log");
  }

  of(name: DrawEventName): Locator {
    return this.root.locator(`li[data-event="${name}"]`);
  }

  count(name: DrawEventName): Promise<number> {
    return this.of(name).count();
  }

  async expectCount(name: DrawEventName, expected: number) {
    await expect(this.of(name)).toHaveCount(expected);
  }

  async expectNever(name: DrawEventName) {
    await this.expectCount(name, 0);
  }

  async expectLastTotal(name: DrawEventName, total: number) {
    await expect(this.of(name).last()).toHaveAttribute("data-total", String(total));
  }

  async idOf(name: DrawEventName, index: number): Promise<string> {
    const id = await this.of(name).nth(index).getAttribute("data-id");
    expect(id, `event ${name} number ${index} carries no id`).not.toBeNull();
    return id!;
  }

  async expectLastId(name: DrawEventName, id: string) {
    await expect(this.of(name).last()).toHaveAttribute("data-id", id);
  }
}
