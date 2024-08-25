import { LngLat } from "./lnglat";

export function extend(dest: any, ...sources: any) {
  for (const src of sources) {
    for (const k in src) {
      dest[k] = src[k];
    }
  }
  return dest;
}

export function wrap(n: any, min: any, max: any) {
  const d = max - min;
  const w = ((((n - min) % d) + d) % d) + min;
  return w === min ? max : w;
}

export function smartWrap(lngLat: any, priorPos: any, transform: any) {
  const originalLngLat = new LngLat(lngLat.lng, lngLat.lat);
  lngLat = new LngLat(lngLat.lng, lngLat.lat);

  // First, try shifting one world in either direction, and see if either is closer to the
  // prior position. This preserves object constancy when the map center is auto-wrapped
  // during animations.
  if (priorPos) {
    const left = new LngLat(lngLat.lng - 360, lngLat.lat);
    const right = new LngLat(lngLat.lng + 360, lngLat.lat);
    const delta = transform.locationPoint(lngLat).distSqr(priorPos);
    if (transform.locationPoint(left).distSqr(priorPos) < delta) {
      lngLat = left;
    } else if (transform.locationPoint(right).distSqr(priorPos) < delta) {
      lngLat = right;
    }
  }

  // Second, wrap toward the center until the new position is on screen, or we can't get
  // any closer.
  while (Math.abs(lngLat.lng - transform.center.lng) > 180) {
    const pos = transform.locationPoint(lngLat);
    if (pos.x >= 0 && pos.y >= 0 && pos.x <= transform.width && pos.y <= transform.height) {
      break;
    }
    if (lngLat.lng > transform.center.lng) {
      lngLat.lng -= 360;
    } else {
      lngLat.lng += 360;
    }
  }

  if (
    lngLat.lng !== originalLngLat.lng &&
    transform.locationPoint(lngLat).y > transform.height / 2 - transform.getHorizon()
  ) {
    return lngLat;
  }

  return originalLngLat;
}

export const anchorTranslate = {
  center: "translate(-50%,-50%)",
  top: "translate(-50%,0)",
  "top-left": "translate(0,0)",
  "top-right": "translate(-100%,0)",
  bottom: "translate(-50%,-100%)",
  "bottom-left": "translate(0,-100%)",
  "bottom-right": "translate(-100%,-100%)",
  left: "translate(0,-50%)",
  right: "translate(-100%,-50%)",
};

export function applyAnchorClass(element: any, anchor: any, prefix: any) {
  const classList = element.classList;
  for (const key in anchorTranslate) {
    classList.remove(`maplibregl-${prefix}-anchor-${key}`);
  }
  classList.add(`maplibregl-${prefix}-anchor-${anchor}`);
}
