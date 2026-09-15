import { expect, type Page } from "@playwright/test";

import type { DrawOptions, LatLng, Step } from "../../src/index";
import { DrawingModes } from "../components/drawing-modes.component";
import { DrawingPanel } from "../components/drawing-panel.component";
import { EventLog } from "../components/event-log.component";
import { MapCanvas } from "../components/map-canvas.component";
import { MapControls } from "../components/map-controls.component";
import { RemoveButtonComponent } from "../components/remove-button.component";
import { TooltipComponent } from "../components/tooltip.component";
import { Drawing } from "../support/drawing";
import { DRAW_EVENTS, type DrawEventName } from "../support/events";
import { Layout, type LineLayout, type Pixel, type SquareLayout, type TriangleLayout } from "../support/layout";
import { withDefaults } from "../support/options";

const FIXTURE = "/e2e/fixture/index.html";

export interface OpenOptions {
  options?: DrawOptions;
  bare?: boolean;
  mount?: boolean;
  bundle?: "dist";
  offset?: boolean;
  position?: "top-left" | "top-right";
}

export interface DrawingSnapshot {
  events: Record<DrawEventName, number>;
  paintedPoints: number;
}

export class DrawMapPage {
  readonly canvas: MapCanvas;
  readonly drawing: Drawing;
  readonly removeButton: RemoveButtonComponent;
  readonly panel: DrawingPanel;
  readonly modes: DrawingModes;
  readonly controls: MapControls;
  readonly events: EventLog;
  readonly tooltip: TooltipComponent;
  readonly layout: Layout;

  readonly api = {
    // опции передаются строкой json, DrawOptions вкладывает выражения maplibre так глубоко, что Playwright не выводит тип аргумента
    mount: (options?: DrawOptions) =>
      this.page.evaluate(
        (raw) => window.mountDraw(raw === undefined ? undefined : JSON.parse(raw)),
        options === undefined ? undefined : JSON.stringify(options),
      ),
    unmount: () => this.page.evaluate(() => window.unmountDraw()),
    dispose: () => this.page.evaluate(() => window.disposeDraw()),
    getInstanceReturnsTheMountedControl: () => this.page.evaluate(() => window.getInstanceReturnsTheMountedControl()),
    undo: () =>
      this.page.evaluate(() => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        window.draw.undo(new MouseEvent("click"));
      }),
    redo: () =>
      this.page.evaluate(() => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        window.draw.redo(new MouseEvent("click"));
      }),
    clear: () =>
      this.page.evaluate(() => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        window.draw.clear();
      }),
    save: () =>
      this.page.evaluate(() => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        window.draw.save();
      }),
    setSteps: (steps: Step[] | LatLng[]) =>
      this.page.evaluate((value) => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        window.draw.setSteps(value);
      }, steps),
    findStepById: (id: string) =>
      this.page.evaluate((stepId) => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        return window.draw.findStepById(stepId);
      }, id),
    // узел хранит соседей, а замкнутая фигура ссылается сама на себя, поэтому со страницы уходят только id
    findNodeById: (id: string) =>
      this.page.evaluate((stepId) => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        const node = window.draw.findNodeById(stepId);
        if (!node) return node;
        return { id: node.val?.id ?? null, prevId: node.prev?.val?.id ?? null, nextId: node.next?.val?.id ?? null };
      }, id),
    getAllStepsAsLinkedList: () =>
      this.page.evaluate(() => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        const list = window.draw.getAllSteps("linkedlist");
        if (Array.isArray(list)) throw new Error("getAllSteps returned an array for linkedlist");
        return {
          size: list.size ?? null,
          headId: list.head?.val?.id ?? null,
          tailId: list.tail?.val?.id ?? null,
          closed: !!list.head && list.tail?.next === list.head,
        };
      }),
    removeAllSteps: () =>
      this.page.evaluate(() => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        window.draw.removeAllSteps();
      }),
    removeControlRightAfterSetSteps: (steps: Step[] | LatLng[]) =>
      this.page.evaluate(async (value) => {
        if (!window.draw) throw new Error("the draw control is not mounted");
        const before = window.mapErrors.length;
        window.draw.setSteps(value);
        window.unmountDraw();
        await new Promise((resolve) => setTimeout(resolve, 150));
        return window.mapErrors.slice(before);
      }, steps),
    removeControlRightAfterMount: (options?: DrawOptions) =>
      this.page.evaluate(
        async (raw) => {
          const before = window.mapErrors.length;
          window.mountDraw(raw === null ? undefined : JSON.parse(raw));
          window.unmountDraw();
          await new Promise((resolve) => setTimeout(resolve, 150));
          return window.mapErrors.slice(before);
        },
        options === undefined ? null : JSON.stringify(options),
      ),
  };

  constructor(private readonly page: Page) {
    this.canvas = new MapCanvas(page);
    this.drawing = new Drawing(page, () => this.canvas.settle());
    this.removeButton = new RemoveButtonComponent(page);
    this.panel = new DrawingPanel(page);
    this.modes = new DrawingModes(page);
    this.controls = new MapControls(page);
    this.events = new EventLog(page, () => this.canvas.settle());
    this.tooltip = new TooltipComponent(page, () => this.canvas.settle());
    this.layout = Layout.forPage(page);
  }

  async open(open: OpenOptions = {}) {
    const params = new URLSearchParams();
    if (!open.bare) params.set("options", JSON.stringify(withDefaults(open.options)));
    if (open.mount === false) params.set("mount", "0");
    if (open.bundle) params.set("bundle", open.bundle);
    if (open.offset) params.set("offset", "1");
    if (open.position) params.set("position", open.position);

    await this.page.goto(`${FIXTURE}?${params.toString()}`);
    await this.canvas.waitUntilReady();
  }

  private async actAndWaitFor(name: DrawEventName, action: () => Promise<void>) {
    const before = await this.events.count(name);
    const idles = await this.canvas.idleCount();
    await action();
    await this.events.expectCount(name, before + 1);
    await this.canvas.waitUntilRepainted(idles);
  }

  async openWithLine(open: OpenOptions = {}): Promise<LineLayout> {
    await this.open(open);
    const line = this.layout.line;

    await this.drawPoint(line.first);
    await this.drawPoint(line.middle);
    await this.drawPoint(line.last);

    return line;
  }

  async openWithLineByTap(open: OpenOptions = {}): Promise<LineLayout> {
    await this.open(open);
    const line = this.layout.line;

    await this.drawPointByTap(line.first);
    await this.drawPointByTap(line.middle);
    await this.drawPointByTap(line.last);

    return line;
  }

  async drawTriangle(): Promise<TriangleLayout> {
    const triangle = this.layout.triangle;
    await this.drawPoint(triangle.a);
    await this.drawPoint(triangle.b);
    await this.drawPoint(triangle.c);
    return triangle;
  }

  async closeByClickingFirst(first: Pixel) {
    const idles = await this.canvas.idleCount();
    await this.canvas.click(first);
    await this.drawing.expectClosed();
    await this.canvas.waitUntilRepainted(idles);
  }

  async closeByTappingFirst(first: Pixel) {
    const idles = await this.canvas.idleCount();
    await this.canvas.tap(first);
    await this.drawing.expectClosed();
    await this.canvas.waitUntilRepainted(idles);
  }

  async enterBreakMode() {
    await this.modes.chooseBreak();
    await this.modes.expectBreakActive();
    await this.parkPointer();
  }

  async hoverSegment(a: Pixel, b: Pixel, fraction = 0.5) {
    await this.parkPointer();
    await this.canvas.hover(this.layout.alongSegment(a, b, fraction));
    await this.drawing.expectBreakSegmentShown();
  }

  async breakAt(a: Pixel, b: Pixel, fraction = 0.5) {
    await this.hoverSegment(a, b, fraction);
    await this.actAndWaitFor("mdl:break", () => this.canvas.click(this.layout.alongSegment(a, b, fraction)));
    await this.canvas.settle();
  }

  async drawClosedTriangle(): Promise<TriangleLayout> {
    const triangle = await this.drawTriangle();
    await this.closeByClickingFirst(triangle.a);
    return triangle;
  }

  async drawClosedSquare(): Promise<SquareLayout> {
    const square = this.layout.square;
    for (const corner of [square.topLeft, square.topRight, square.bottomRight, square.bottomLeft]) {
      await this.drawPoint(corner);
    }
    await this.closeByClickingFirst(square.topLeft);
    return square;
  }

  async undo() {
    await this.actAndWaitFor("mdl:undo", () => this.panel.clickUndo());
  }

  async redo() {
    await this.actAndWaitFor("mdl:redo", () => this.panel.clickRedo());
  }

  async deleteAll() {
    await this.actAndWaitFor("mdl:removeall", () => this.panel.clickDelete());
  }

  async tapUndo() {
    await this.actAndWaitFor("mdl:undo", () => this.panel.tapUndo());
  }

  async tapDeleteAll() {
    await this.actAndWaitFor("mdl:removeall", () => this.panel.tapDelete());
  }

  async save() {
    await this.actAndWaitFor("mdl:save", () => this.panel.clickSave());
  }

  async snapshot(): Promise<DrawingSnapshot> {
    const events = {} as Record<DrawEventName, number>;
    for (const name of DRAW_EVENTS) {
      events[name] = await this.events.count(name);
    }
    return { events, paintedPoints: (await this.drawing.points()).length };
  }

  async expectNothingHappenedSince(snapshot: DrawingSnapshot) {
    await this.canvas.settle();
    for (const name of DRAW_EVENTS) {
      await expect(this.events.of(name), `${name} was recorded`).toHaveCount(snapshot.events[name]);
    }
    expect((await this.drawing.points()).length).toBe(snapshot.paintedPoints);
  }

  mapErrors(): Promise<string[]> {
    return this.page.evaluate(() => window.mapErrors);
  }

  async drawPoint(at: Pixel) {
    await this.actAndWaitFor("mdl:add", () => this.canvas.click(at));
  }

  async drawPointByTap(at: Pixel) {
    await this.actAndWaitFor("mdl:add", () => this.canvas.tap(at));
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

  async sweepPointer(): Promise<Pixel> {
    const start = this.layout.emptySpot;
    const end = this.layout.offsetFrom(start, 60, 0);
    await this.canvas.hoverThrough(start);
    await this.canvas.hoverThrough(end);
    return end;
  }

  removeControlRightAfterMovingTo(at: Pixel): Promise<string[]> {
    return this.changeControlRightAfterMovingTo(at, { replace: false });
  }

  replaceControlRightAfterMovingTo(at: Pixel, options?: DrawOptions): Promise<string[]> {
    return this.changeControlRightAfterMovingTo(at, { replace: true, options });
  }

  private changeControlRightAfterMovingTo(
    at: Pixel,
    change: { replace: boolean; options?: DrawOptions },
  ): Promise<string[]> {
    return this.page.evaluate(
      async ({ target, replace, raw }) => {
        const before = window.mapErrors.length;

        window.map
          .getCanvas()
          .dispatchEvent(new MouseEvent("mousemove", { clientX: target.x, clientY: target.y, bubbles: true }));
        if (!window.draw) throw new Error("the draw control is not mounted");
        if (replace) {
          window.disposeDraw();
          window.mountDraw(raw === null ? undefined : JSON.parse(raw));
        } else {
          window.unmountDraw();
        }
        await new Promise((resolve) => setTimeout(resolve, 150));

        return window.mapErrors.slice(before);
      },
      {
        target: at,
        replace: change.replace,
        raw: change.options === undefined ? null : JSON.stringify(change.options),
      },
    );
  }

  async dragPoint(from: Pixel, to: Pixel) {
    await this.canvas.press(from);
    await this.canvas.dragTo(to);
    await this.canvas.release();
  }

  async startDrag(from: Pixel, to: Pixel) {
    await this.canvas.hoverThrough(this.layout.emptySpot);
    await this.canvas.hoverThrough(from);
    await this.canvas.press(from);
    await this.canvas.dragTo(to);
  }

  async startDragByTouch(from: Pixel, to: Pixel) {
    await this.canvas.pressAndMoveByTouch(from, to);
  }

  async dragPointByTouch(from: Pixel, to: Pixel) {
    await this.actAndWaitFor("mdl:moveend", () => this.canvas.dragPointByTouch(from, to));
    // слои захвата точек снова отвечают на касание только после следующей отрисовки, тап до неё проходит мимо точки
    await this.canvas.settle();
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
    await this.events.expectUnchanged("mdl:add", before);
  }

  async expectBareMapAtByTap(at: Pixel) {
    const before = await this.events.count("mdl:add");
    await this.tapPoint(at);
    await this.events.expectCount("mdl:add", before + 1);
    await this.removeButton.expectHidden();
  }
}
