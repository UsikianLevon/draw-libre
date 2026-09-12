import type { Page } from "@playwright/test";

import { DrawingModes } from "../components/drawing-modes.component";
import { DrawingPanel } from "../components/drawing-panel.component";
import { DynamicLine } from "../components/dynamic-line.component";
import { EventLog } from "../components/event-log.component";
import { MapCanvas } from "../components/map-canvas.component";
import { MapControls } from "../components/map-controls.component";
import { RemoveButtonComponent } from "../components/remove-button.component";
import { Layout, type LineLayout, type Pixel } from "../support/layout";

const FIXTURE = "/e2e/fixture/index.html";

interface OpenOptions {
  pointGeneration?: "auto";
  offset?: boolean;
}

export class DrawMapPage {
  readonly canvas: MapCanvas;
  readonly removeButton: RemoveButtonComponent;
  readonly dynamicLine: DynamicLine;
  readonly panel: DrawingPanel;
  readonly modes: DrawingModes;
  readonly controls: MapControls;
  readonly events: EventLog;
  readonly layout: Layout;

  constructor(private readonly page: Page) {
    this.canvas = new MapCanvas(page);
    this.removeButton = new RemoveButtonComponent(page);
    this.dynamicLine = new DynamicLine(page);
    this.panel = new DrawingPanel(page);
    this.modes = new DrawingModes(page);
    this.controls = new MapControls(page);
    this.events = new EventLog(page);
    this.layout = Layout.forPage(page);
  }

  async open(options: OpenOptions = {}) {
    const params = new URLSearchParams();
    if (options.pointGeneration === "auto") params.set("preset", "auto");
    if (options.offset) params.set("offset", "1");

    const query = params.toString();
    await this.page.goto(query ? `${FIXTURE}?${query}` : FIXTURE);
    await this.canvas.waitUntilReady();
  }

  async openWithLine(options: OpenOptions = {}): Promise<LineLayout> {
    await this.open(options);
    const line = this.layout.line;

    await this.drawPoint(line.first);
    await this.drawPoint(line.middle);
    await this.drawPoint(line.last);

    return line;
  }

  async openWithLineByTap(): Promise<LineLayout> {
    await this.open();
    const line = this.layout.line;

    await this.drawPointByTap(line.first);
    await this.drawPointByTap(line.middle);
    await this.drawPointByTap(line.last);

    return line;
  }

  async drawPoint(at: Pixel) {
    const before = await this.events.count("mdl:add");
    const idles = await this.canvas.idleCount();
    await this.canvas.click(at);
    await this.events.expectCount("mdl:add", before + 1);
    await this.canvas.waitUntilRepainted(idles);
  }

  async drawPointByTap(at: Pixel) {
    const before = await this.events.count("mdl:add");
    const idles = await this.canvas.idleCount();
    await this.canvas.tap(at);
    await this.events.expectCount("mdl:add", before + 1);
    await this.canvas.waitUntilRepainted(idles);
  }

  async hoverPoint(at: Pixel) {
    await this.canvas.hover(at);
  }

  async tapPoint(at: Pixel) {
    await this.canvas.tap(at);
  }

  async removePointUnderPointer() {
    const idles = await this.canvas.idleCount();
    await this.removeButton.click();
    await this.canvas.waitUntilRepainted(idles);
  }

  async tapRemoveButton() {
    const idles = await this.canvas.idleCount();
    const box = await this.removeButton.box();

    await this.removeButton.tap();
    this.canvas.noteTapAt({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

    await this.canvas.waitUntilRepainted(idles);
  }

  async tapEmptyMap() {
    await this.canvas.tap(this.layout.emptySpot);
  }

  async walkPointerToRemoveButton() {
    const box = await this.removeButton.box();
    await this.canvas.hoverThrough({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }

  async parkPointer() {
    await this.canvas.hover(this.layout.emptySpot);
  }

  async dragPoint(from: Pixel, to: Pixel) {
    await this.canvas.press(from);
    await this.canvas.dragTo(to);
    await this.canvas.release();
  }

  async expectPointAt(at: Pixel) {
    await this.parkPointer();
    await this.removeButton.expectHidden();
    await this.hoverPoint(at);
    await this.removeButton.expectVisible();
  }

  async expectNoRemoveButtonAt(at: Pixel) {
    await this.parkPointer();
    await this.removeButton.expectHidden();

    const before = await this.events.count("mdl:pointenter");
    await this.hoverPoint(at);
    await this.events.expectCount("mdl:pointenter", before + 1);

    await this.removeButton.expectHidden();
  }

  async expectBareMapAt(at: Pixel) {
    await this.parkPointer();

    const before = await this.events.count("mdl:add");
    await this.canvas.click(at);
    await this.events.expectCount("mdl:add", before + 1);
  }

  async expectPointAtByTap(at: Pixel) {
    const before = await this.events.count("mdl:add");
    await this.tapPoint(at);
    await this.removeButton.expectVisible();
    await this.events.expectCount("mdl:add", before);
  }

  async expectBareMapAtByTap(at: Pixel) {
    const before = await this.events.count("mdl:add");
    await this.tapPoint(at);
    await this.events.expectCount("mdl:add", before + 1);
    await this.removeButton.expectHidden();
  }
}
