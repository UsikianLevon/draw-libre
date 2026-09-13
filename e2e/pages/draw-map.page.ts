import type { Page } from "@playwright/test";

import { DrawingModes } from "../components/drawing-modes.component";
import { DrawingPanel } from "../components/drawing-panel.component";
import { DynamicLine } from "../components/dynamic-line.component";
import { EventLog } from "../components/event-log.component";
import { GhostPoint } from "../components/ghost-point.component";
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
  readonly ghost: GhostPoint;
  readonly panel: DrawingPanel;
  readonly modes: DrawingModes;
  readonly controls: MapControls;
  readonly events: EventLog;
  readonly layout: Layout;

  constructor(private readonly page: Page) {
    this.canvas = new MapCanvas(page);
    this.removeButton = new RemoveButtonComponent(page);
    this.dynamicLine = new DynamicLine(page);
    this.ghost = new GhostPoint(page);
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

  async removeControlRightAfterMovingTo(at: Pixel): Promise<string[]> {
    return this.page.evaluate(async (target) => {
      const errors: string[] = [];
      window.map.on("error", (event) => errors.push(event.error.message));

      window.map
        .getCanvas()
        .dispatchEvent(new MouseEvent("mousemove", { clientX: target.x, clientY: target.y, bubbles: true }));
      if (!window.draw) throw new Error("the draw control is not mounted");
      window.map.removeControl(window.draw);
      await new Promise((resolve) => setTimeout(resolve, 150));

      return errors;
    }, at);
  }

  async dragPoint(from: Pixel, to: Pixel) {
    await this.canvas.press(from);
    await this.canvas.dragTo(to);
    await this.canvas.release();
  }

  async hoveredPointIds(): Promise<string[]> {
    return this.page.evaluate(() => {
      const source = window.map.getStyle().sources["mdl-unified-source"] as { data: GeoJSON.FeatureCollection };
      const points = source.data.features.filter((feature) => feature.geometry.type === "Point");

      return points
        .filter((feature) => {
          const id = feature.properties?.id as string;
          return window.map.getFeatureState({ source: "mdl-unified-source", id }).hover === true;
        })
        .map((feature) => String(feature.properties?.id));
    });
  }

  async hoveredPointPixels(): Promise<Pixel[]> {
    return this.page.evaluate(() => {
      const source = window.map.getStyle().sources["mdl-unified-source"] as { data: GeoJSON.FeatureCollection };
      const box = window.map.getContainer().getBoundingClientRect();

      return source.data.features
        .filter((feature) => feature.geometry.type === "Point")
        .filter((feature) => {
          const id = feature.properties?.id as string;
          return window.map.getFeatureState({ source: "mdl-unified-source", id }).hover === true;
        })
        .map((feature) => {
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          const point = window.map.project({ lng, lat });
          return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
        });
    });
  }

  async duplicateVertexCount(): Promise<number> {
    return this.page.evaluate(() => {
      const source = window.map.getStyle().sources["mdl-unified-source"] as { data: GeoJSON.FeatureCollection };
      const seen = new Set<string>();
      let duplicates = 0;

      for (const feature of source.data.features) {
        if (feature.geometry.type !== "Point") continue;
        const key = (feature.geometry.coordinates as number[]).join();
        if (seen.has(key)) duplicates += 1;
        seen.add(key);
      }

      return duplicates;
    });
  }

  async vertexPixelsOnCopy(copies: number): Promise<Pixel[]> {
    return this.page.evaluate((shift) => {
      const source = window.map.getStyle().sources["mdl-unified-source"] as { data: GeoJSON.FeatureCollection };
      const box = window.map.getContainer().getBoundingClientRect();

      return source.data.features
        .filter((feature) => feature.geometry.type === "Point")
        .map((feature) => {
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
          const point = window.map.project({ lng: lng + 360 * shift, lat });
          return { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
        });
    }, copies);
  }

  async vertexCoordinates(): Promise<[number, number][]> {
    return this.page.evaluate(() => {
      const source = window.map.getStyle().sources["mdl-unified-source"] as { data: GeoJSON.FeatureCollection };
      return source.data.features
        .filter((feature) => feature.geometry.type === "Point")
        .map((feature) => (feature.geometry as GeoJSON.Point).coordinates as [number, number]);
    });
  }

  async vertexCount(): Promise<number> {
    return this.page.evaluate(() => {
      const source = window.map.getStyle().sources["mdl-unified-source"] as { data: GeoJSON.FeatureCollection };
      return source.data.features.filter((feature) => feature.geometry.type === "Point").length;
    });
  }

  async vertexCountBy(kind: "primary" | "auxiliary"): Promise<number> {
    return this.page.evaluate((wanted) => {
      const source = window.map.getStyle().sources["mdl-unified-source"] as { data: GeoJSON.FeatureCollection };
      return source.data.features.filter((feature) => {
        if (feature.geometry.type !== "Point") return false;
        const auxiliary = feature.properties?.isAuxiliary === true;
        return wanted === "auxiliary" ? auxiliary : !auxiliary;
      }).length;
    }, kind);
  }

  async layerVisibility(layerId: string): Promise<string> {
    return this.page.evaluate(
      (id) => (window.map.getLayoutProperty(id, "visibility") as string | undefined) ?? "visible",
      layerId,
    );
  }

  async lineIsClosed(): Promise<boolean> {
    return this.page.evaluate(() => {
      const source = window.map.getStyle().sources["mdl-unified-source"] as { data: GeoJSON.FeatureCollection };
      const line = source.data.features.find((feature) => feature.geometry.type === "LineString");
      if (!line) return false;

      const coordinates = (line.geometry as GeoJSON.LineString).coordinates;
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (!first || !last || coordinates.length < 4) return false;

      return first[0] === last[0] && first[1] === last[1];
    });
  }

  async recordVisibilityChanges() {
    await this.page.evaluate(() => {
      const map = window.map as typeof window.map & { __visibility?: string[] };
      map.__visibility = [];
      const original = map.setLayoutProperty.bind(map);
      map.setLayoutProperty = ((layerId: string, name: string, value: unknown) => {
        if (name === "visibility") map.__visibility?.push(`${layerId}=${String(value)}`);
        return original(layerId, name, value);
      }) as unknown as typeof map.setLayoutProperty;
    });
  }

  async dragLayerChanges(): Promise<string[]> {
    return this.page.evaluate(() => {
      const map = window.map as typeof window.map & { __visibility?: string[] };
      const watched = [
        "mdl-points-hit-layer",
        "mdl-first-point-hit-layer",
        "mdl-auxiliary-point-hit-layer",
        "mdl-line-layer-transparent",
      ];
      return (map.__visibility ?? []).filter((entry) => watched.some((id) => entry.startsWith(`${id}=`)));
    });
  }

  async pointNear(at: Pixel): Promise<Pixel | null> {
    return this.page.evaluate((target) => {
      const painted = window.map.queryRenderedFeatures({ layers: ["mdl-points-layer"] });
      const box = window.map.getContainer().getBoundingClientRect();

      let best: { x: number; y: number } | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const feature of painted) {
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const point = window.map.project({ lng, lat });
        const screen = { x: Math.round(point.x + box.left), y: Math.round(point.y + box.top) };
        const distance = Math.hypot(screen.x - target.x, screen.y - target.y);

        if (distance < bestDistance) {
          bestDistance = distance;
          best = screen;
        }
      }

      return bestDistance <= 20 ? best : null;
    }, at);
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
