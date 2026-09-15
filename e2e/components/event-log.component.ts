import { expect, type Locator, type Page } from "@playwright/test";

import type { DrawEventName, RecordedPayload } from "../support/events";

export class EventLog {
  private readonly root: Locator;

  constructor(
    page: Page,
    private readonly settle: () => Promise<void>,
  ) {
    this.root = page.locator("#event-log");
  }

  of(name: DrawEventName): Locator {
    return this.root.locator(`li[data-event="${name}"]`);
  }

  count(name: DrawEventName): Promise<number> {
    return this.of(name).count();
  }

  async expectCount(name: DrawEventName, expected: number) {
    if (expected === 0) await this.settle();
    await expect(this.of(name)).toHaveCount(expected);
  }

  async expectNever(name: DrawEventName) {
    await this.expectCount(name, 0);
  }

  async expectUnchanged(name: DrawEventName, before: number) {
    await this.settle();
    await expect(this.of(name)).toHaveCount(before);
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

  async payloadOf(name: DrawEventName, index: number): Promise<RecordedPayload> {
    const raw = await this.of(name).nth(index).getAttribute("data-payload");
    expect(raw, `event ${name} number ${index} carries no payload`).not.toBeNull();
    return JSON.parse(raw!) as RecordedPayload;
  }

  async lastPayload(name: DrawEventName): Promise<RecordedPayload> {
    const total = await this.count(name);
    expect(total, `no ${name} event was recorded`).toBeGreaterThan(0);
    return this.payloadOf(name, total - 1);
  }

  async expectLastPayload(name: DrawEventName, partial: Record<string, unknown>) {
    await expect
      .poll(async () => {
        const total = await this.count(name);
        return total === 0 ? null : this.payloadOf(name, total - 1);
      })
      .toMatchObject(partial);
  }
}
