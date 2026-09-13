import { expect, type Locator, type Page } from "@playwright/test";

import type { Pixel } from "../support/layout";

const DRAG_STEPS = 12;

const DOUBLE_TAP_WINDOW_MS = 350;
const DOUBLE_TAP_RADIUS_PX = 48;

export class MapCanvas {
  readonly root: Locator;

  private pointer: Pixel = { x: 0, y: 0 };
  private lastTap: { at: Pixel; time: number } | null = null;

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

  async click(at: Pixel) {
    this.pointer = at;
    await this.page.mouse.click(at.x, at.y);
  }

  async rightClick(at: Pixel) {
    this.pointer = at;
    await this.page.mouse.click(at.x, at.y, { button: "right" });
  }

  async pixelAt(at: Pixel): Promise<[number, number, number]> {
    return this.page.evaluate(
      (target) =>
        new Promise<[number, number, number]>((resolve, reject) => {
          const map = window.map;
          const canvas = map.getCanvas();
          const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
          if (!gl) {
            reject(new Error("no webgl context"));
            return;
          }

          const box = canvas.getBoundingClientRect();
          const ratio = canvas.width / box.width;
          const x = Math.round((target.x - box.left) * ratio);
          const y = Math.round((box.height - (target.y - box.top)) * ratio);

          const read = () => {
            const pixel = new Uint8Array(4);
            gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            map.off("render", read);
            resolve([pixel[0] ?? 0, pixel[1] ?? 0, pixel[2] ?? 0]);
          };

          map.on("render", read);
          map.triggerRepaint();
        }),
      at,
    );
  }

  async jumpTo(camera: { center?: [number, number]; bearing?: number; pitch?: number }) {
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
    await this.page.mouse.up();
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
