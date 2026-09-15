import type { Page } from "@playwright/test";

export interface Pixel {
  x: number;
  y: number;
}

export interface LineLayout {
  first: Pixel;
  middle: Pixel;
  last: Pixel;
}

export interface RowLayout {
  left: Pixel;
  right: Pixel;
  midpoint: Pixel;
}

export interface TriangleLayout {
  a: Pixel;
  b: Pixel;
  c: Pixel;
}

export interface SquareLayout {
  topLeft: Pixel;
  topRight: Pixel;
  bottomRight: Pixel;
  bottomLeft: Pixel;
}

const FALLBACK_VIEWPORT = { width: 1280, height: 720 };

export class Layout {
  private constructor(private readonly viewport: { width: number; height: number }) {}

  static forPage(page: Page): Layout {
    return new Layout(page.viewportSize() ?? FALLBACK_VIEWPORT);
  }

  get line(): LineLayout {
    return {
      first: this.at(0.25, 0.35),
      middle: this.at(0.45, 0.35),
      last: this.at(0.58, 0.6),
    };
  }

  get rowPair(): RowLayout {
    const left = this.at(0.25, 0.45);
    const right = this.at(0.55, 0.45);
    return { left, right, midpoint: { x: Math.round((left.x + right.x) / 2), y: left.y } };
  }

  get triangle(): TriangleLayout {
    return {
      a: this.at(0.25, 0.3),
      b: this.at(0.55, 0.3),
      c: this.at(0.4, 0.55),
    };
  }

  get square(): SquareLayout {
    return {
      topLeft: this.at(0.3, 0.3),
      topRight: this.at(0.6, 0.3),
      bottomRight: this.at(0.6, 0.55),
      bottomLeft: this.at(0.3, 0.55),
    };
  }

  centroid(points: Pixel[]): Pixel {
    const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 });
    return { x: Math.round(sum.x / points.length), y: Math.round(sum.y / points.length) };
  }

  get nearRightEdge(): Pixel {
    return { x: this.viewport.width - 18, y: Math.round(this.viewport.height * 0.5) };
  }

  get emptySpot(): Pixel {
    return { x: Math.round(this.viewport.width * 0.3), y: this.viewport.height - 60 };
  }

  offsetFrom(at: Pixel, dx: number, dy: number): Pixel {
    return { x: at.x + dx, y: at.y + dy };
  }

  alongSegment(a: Pixel, b: Pixel, fraction: number): Pixel {
    return { x: Math.round(a.x + (b.x - a.x) * fraction), y: Math.round(a.y + (b.y - a.y) * fraction) };
  }

  segmentMidpoint(a: Pixel, b: Pixel): Pixel {
    return this.alongSegment(a, b, 0.5);
  }

  private at(fractionX: number, fractionY: number): Pixel {
    return {
      x: Math.round(this.viewport.width * fractionX),
      y: Math.round(this.viewport.height * fractionY),
    };
  }
}
