import { expect, type CDPSession, type Locator, type Page } from "@playwright/test";

import type { Pixel } from "../support/layout";

const DRAG_STEPS = 12;
const TOUCH_DRAG_STEPS = 8;

const DOUBLE_TAP_WINDOW_MS = 350;
const DOUBLE_TAP_RADIUS_PX = 48;

const SETTLE_FRAMES = 2;
const SETTLE_TIMERS_MS = 50;

export class MapCanvas {
  readonly root: Locator;

  private pointer: Pixel = { x: 0, y: 0 };
  private lastTap: { at: Pixel; time: number } | null = null;
  private touch: CDPSession | null = null;

  constructor(private readonly page: Page) {
    this.root = page.locator("#map canvas");
  }

  async waitUntilReady() {
    await expect(this.page.locator("body")).toHaveAttribute("data-ready", "true");
    await expect(this.root).toBeVisible();
    await this.waitUntilRepainted(0);
  }

  async idleCount(): Promise<number> {
    const value = await this.page.locator("body").getAttribute("data-idles");
    return value ? Number(value) : 0;
  }

  async waitUntilRepainted(previous: number) {
    await expect.poll(() => this.idleCount()).toBeGreaterThan(previous);
  }

  async settle() {
    const idles = await this.idleCount();
    await this.page.evaluate(() => window.map.triggerRepaint());
    await this.waitUntilRepainted(idles);
    await this.page.evaluate(
      ({ frames, ms }) =>
        new Promise<void>((resolve) => {
          const tick = (left: number) => {
            if (left === 0) {
              setTimeout(resolve, ms);
              return;
            }
            requestAnimationFrame(() => tick(left - 1));
          };
          tick(frames);
        }),
      { frames: SETTLE_FRAMES, ms: SETTLE_TIMERS_MS },
    );
  }

  async click(at: Pixel) {
    this.pointer = at;
    await this.page.mouse.click(at.x, at.y);
  }

  async rightClick(at: Pixel) {
    this.pointer = at;
    await this.page.mouse.click(at.x, at.y, { button: "right" });
  }

  async dblclick(at: Pixel) {
    this.pointer = at;
    await this.page.mouse.dblclick(at.x, at.y);
  }

  zoom(): Promise<number> {
    return this.page.evaluate(() => window.map.getZoom());
  }

  async jumpTo(camera: { center?: [number, number]; zoom?: number; bearing?: number; pitch?: number }) {
    const idles = await this.idleCount();
    await this.page.evaluate((target) => window.map.jumpTo(target), camera);
    await this.waitUntilRepainted(idles);
  }

  async shiftWorldCopies(count: number) {
    const idles = await this.idleCount();
    await this.page.evaluate((copies) => {
      const centre = window.map.getCenter();
      window.map.setCenter([centre.lng + 360 * copies, centre.lat]);
    }, count);
    await this.waitUntilRepainted(idles);
  }

  async hover(at: Pixel) {
    this.pointer = at;
    await this.page.mouse.move(at.x, at.y);
  }

  async press(at: Pixel) {
    await this.hover(at);
    await this.page.mouse.down();
  }

  async dragTo(at: Pixel) {
    await this.page.mouse.move(at.x, at.y, { steps: DRAG_STEPS });
    this.pointer = at;
  }

  async hoverThrough(at: Pixel) {
    await this.page.mouse.move(at.x, at.y, { steps: DRAG_STEPS });
    this.pointer = at;
  }

  async moveWithinOneTask(path: Pixel[]) {
    await this.page.evaluate((points) => {
      const canvas = window.map.getCanvas();
      for (const point of points) {
        canvas.dispatchEvent(new MouseEvent("mousemove", { clientX: point.x, clientY: point.y, bubbles: true }));
      }
    }, path);
    this.pointer = path[path.length - 1] ?? this.pointer;
  }

  async release() {
    const idles = await this.idleCount();
    await this.page.mouse.up();
    await this.page.evaluate(() => window.map.triggerRepaint());
    await this.waitUntilRepainted(idles);
  }

  async tap(at: Pixel) {
    await this.separateGesture(at);
    this.pointer = at;
    await this.page.touchscreen.tap(at.x, at.y);
    this.noteTapAt(at);
  }

  noteTapAt(at: Pixel) {
    this.lastTap = { at, time: Date.now() };
  }

  // page.touchscreen умеет только tap, перетаскивание пальцем требует доверенных касаний через протокол
  async pressAndMoveByTouch(from: Pixel, to: Pixel) {
    await this.separateGesture(from);
    this.touch = await this.page.context().newCDPSession(this.page);

    await this.touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from.x, y: from.y }] });
    for (let step = 1; step <= TOUCH_DRAG_STEPS; step += 1) {
      const x = from.x + ((to.x - from.x) * step) / TOUCH_DRAG_STEPS;
      const y = from.y + ((to.y - from.y) * step) / TOUCH_DRAG_STEPS;
      await this.touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    }

    this.pointer = to;
  }

  async releaseTouch() {
    if (!this.touch) throw new Error("no finger is on the screen");
    await this.touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await this.touch.detach();
    this.touch = null;
    this.noteTapAt(this.pointer);
  }

  async dragPointByTouch(from: Pixel, to: Pixel) {
    await this.pressAndMoveByTouch(from, to);
    await this.releaseTouch();
  }

  private async separateGesture(at: Pixel) {
    if (!this.lastTap) return;

    const dx = at.x - this.lastTap.at.x;
    const dy = at.y - this.lastTap.at.y;
    if (Math.hypot(dx, dy) > DOUBLE_TAP_RADIUS_PX) return;

    const elapsed = Date.now() - this.lastTap.time;
    if (elapsed >= DOUBLE_TAP_WINDOW_MS) return;

    await this.page.waitForTimeout(DOUBLE_TAP_WINDOW_MS - elapsed);
  }
}
