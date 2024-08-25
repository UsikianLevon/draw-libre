export class Point {
  x: any;
  y: any;

  constructor(x: any, y: any) {
    this.x = x;
    this.y = y;
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  equals(other: any) {
    return this.x === other.x && this.y === other.y;
  }

  dist(p: any) {
    return Math.sqrt(this.distSqr(p));
  }

  distSqr(p: any) {
    const dx = p.x - this.x,
      dy = p.y - this.y;
    return dx * dx + dy * dy;
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  angleTo(b: any) {
    return Math.atan2(this.y - b.y, this.x - b.x);
  }

  angleWith(b: any) {
    return this.angleWithSep(b.x, b.y);
  }

  angleWithSep(x: any, y: any) {
    return Math.atan2(this.x * y - this.y * x, this.x * x + this.y * y);
  }

  _matMult(m: any) {
    const x = m[0] * this.x + m[1] * this.y,
      y = m[2] * this.x + m[3] * this.y;
    this.x = x;
    this.y = y;
    return this;
  }

  _add(p: any) {
    this.x += p.x;
    this.y += p.y;
    return this;
  }
  _sub(p: any) {
    this.x -= p.x;
    this.y -= p.y;
    return this;
  }

  _mult(k: any) {
    this.x *= k;
    this.y *= k;
    return this;
  }

  _div(k: any) {
    this.x /= k;
    this.y /= k;
    return this;
  }

  _multByPoint(p: any) {
    this.x *= p.x;
    this.y *= p.y;
    return this;
  }

  _divByPoint(p: any) {
    this.x /= p.x;
    this.y /= p.y;
    return this;
  }

  _unit() {
    this._div(this.mag());
    return this;
  }

  _perp() {
    const y = this.y;
    this.y = this.x;
    this.x = -y;
    return this;
  }

  _rotate(angle: any) {
    const cos = Math.cos(angle),
      sin = Math.sin(angle),
      x = cos * this.x - sin * this.y,
      y = sin * this.x + cos * this.y;
    this.x = x;
    this.y = y;
    return this;
  }

  _rotateAround(angle: any, p: any) {
    const cos = Math.cos(angle),
      sin = Math.sin(angle),
      x = p.x + cos * (this.x - p.x) - sin * (this.y - p.y),
      y = p.y + sin * (this.x - p.x) + cos * (this.y - p.y);
    this.x = x;
    this.y = y;
    return this;
  }

  _round() {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  static convert(p: any) {
    if (p instanceof Point) {
      return /** @type {Point} */ p;
    }
    if (Array.isArray(p)) {
      return new Point(+p[0], +p[1]);
    }
    if (p.x !== undefined && p.y !== undefined) {
      return new Point(+p.x, +p.y);
    }
    throw new Error("Expected [x, y] or {x, y} point format");
  }
}
