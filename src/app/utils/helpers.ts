import type { MapLayerMouseEvent, MapMouseEvent } from "maplibre-gl";
import type { LatLng, Point, Uuid, EventsCtx, RequiredDrawOptions } from "#app/types/index";
import type { UnifiedMap } from "#app/types/map";

import type { ListNode, Store } from "#app/store/index";

import type { DrawingMode } from "#components/map/mode";
import { ELAYERS } from "./geo_constants";

export class MapUtils {
  static isFeatureTriggered(event: MapLayerMouseEvent, layerIds: string[]) {
    const layers = event.target.queryRenderedFeatures(event.point, {
      layers: layerIds,
    });
    return layers.some((layer) => layerIds.includes(layer.layer.id));
  }

  static getPixelCoordinates = (map: UnifiedMap, coords: LatLng) => {
    const { lat, lng } = coords;
    return map.project([lng, lat]);
  };

  static queryPointId = (map: UnifiedMap, point: MapMouseEvent["point"]) => {
    const query = map.queryRenderedFeatures(point, {
      layers: [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer, ELAYERS.AuxiliaryPointLayer, ELAYERS.SinglePointLayer],
    });

    const id = query?.[0]?.properties.id;
    return id;
  };

  static queryPoint = (map: UnifiedMap, point: MapMouseEvent["point"]) => {
    const query = map.queryRenderedFeatures(point, {
      layers: [ELAYERS.PointsLayer, ELAYERS.FirstPointLayer, ELAYERS.AuxiliaryPointLayer, ELAYERS.SinglePointLayer],
    });
    return query?.[0];
  };
}

export class GeometryFactory {
  static #collectGeometryCoordinates(store: Store): number[][] {
    const coordinates = [];
    let current = store.head;
    const visitedNodes = new Set();

    while (current !== null) {
      if (visitedNodes.has(current.val?.id)) {
        if (store.head && store.head.val) {
          coordinates.push([store.head.val.lng, store.head.val.lat]);
        }
        break;
      }
      visitedNodes.add(current.val?.id);

      if (current.val) {
        coordinates.push([current.val.lng, current.val.lat]);
      }
      current = current.next;
    }

    return coordinates;
  }

  static getLine(current: [number, number], next: [number, number]) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [current, next],
          },
        },
      ],
    };
  }

  static getAllLines(coordinates: number[][]) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        },
      ],
    };
  }

  static getPolygon(coordinates: number[][]) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [coordinates],
          },
        },
      ],
    };
  }

  static getPoints(store: Store) {
    let current = store.head;
    const pointFeatures = [];
    const visitedNodes = new Set();

    while (current !== null) {
      if (visitedNodes.has(current.val?.id)) {
        break;
      }
      if (current.val) {
        const val = current.val;
        const head = current.val.id === store.head?.val?.id;
        pointFeatures.push({
          type: "Feature",
          properties: { id: val.id, lat: val.lat, lng: val.lng, isFirst: head, isAuxiliary: val.isAuxiliary },
          geometry: {
            type: "Point",
            coordinates: [val.lng, val.lat],
          },
        });
      }
      visitedNodes.add(current.val?.id);
      current = current.next;
    }

    return {
      type: "FeatureCollection",
      features: pointFeatures,
    };
  }

  // CAUTION: render is dependent on this function
  static getUnifiedFeatures(
    store: Store,
  ): GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon | GeoJSON.Point> {
    const points = this.getPoints(store).features;
    const coordinates = this.#collectGeometryCoordinates(store);

    const lines = this.getAllLines(coordinates).features;
    const polygons = this.getPolygon(coordinates).features;

    return {
      type: "FeatureCollection",
      features: [...points, ...lines, ...polygons],
    } as GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon | GeoJSON.Point>;
  }
}

export class Spatial {
  static getGeometryIndex = (store: Store, id: Uuid) => {
    let current = store.head;
    let idx = 0;
    const visitedNodes = new Set();
    while (current !== null) {
      if (visitedNodes.has(current.val?.id)) {
        break;
      }
      if (current.val?.id === id) {
        return idx;
      }

      visitedNodes.add(current.val?.id);
      idx++;
      current = current.next;
    }
    return -1;
  };

  // √(x1​−x2​)²+(y1​−y2​)²​
  static distance = (point1: Point, point2: Point) =>
    Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);

  static checkIfPointIsOnLine = (A: Point, B: Point, P: Point): boolean => {
    const EPSILON = 0.1;

    const distanceAB = this.distance(A, B);
    const distanceAP = this.distance(A, P);
    const distancePB = this.distance(P, B);

    if (Math.abs(distanceAP + distancePB - distanceAB) < EPSILON) {
      return true;
    }

    return false;
  };

  static isClosedGeometry = (store: Store, options: RequiredDrawOptions) => {
    if (options.pointGeneration === "auto") {
      return store.tail?.next?.val?.id === store.head?.val?.id && store.tail?.next !== null;
    }
    return store.tail?.next === store.head;
  };

  //  when we have 1 primary <--- 1 aux <--- 1 primary current will be an aux when 1 prim <--- 1 aux and a primary 1 aux <--- 1 prim
  //                         [aux]     [primary]
  static breakGeometry = (store: Store, options: RequiredDrawOptions, current: ListNode) => {
    if (!store.head) return;

    if (options.pointGeneration === "auto") {
      // if the current node is an aux, then we need to make one step back for the tail and the head is the next node from the aux point
      if (current.val?.isAuxiliary) {
        store.head = current.next as ListNode;
        store.head.prev = null;
        store.tail = current.prev as ListNode;
        store.tail.next = null;
      } else {
        // else the tail is the current node and for the head we need to jump over the aux point so the next.next
        store.head = current.next?.next as ListNode;
        store.head.prev = null;
        store.tail = current;
        store.tail.next = null;
      }
      store.size = store.size - 1;
    } else {
      // no aux here, so the tail is the current node and the head is the next node
      store.head = current.next as ListNode;
      store.head.prev = null;
      store.tail = current;
      store.tail.next = null;
    }
  };

  static closeGeometry = (store: Store, mode: DrawingMode) => {
    if (store.tail && store.head) {
      store.tail.next = store.head;
      store.head.prev = store.tail;
    }
    mode.setClosedGeometry(true);
  };

  static canCloseGeometry = (store: Store, options: RequiredDrawOptions) => {
    const storeSize = options.pointGeneration === "auto" ? store.size > 3 : store.size > 2;
    return storeSize && !this.isClosedGeometry(store, options);
  };

  static canBreakClosedGeometry = (store: Store, options: RequiredDrawOptions) => {
    if (options.pointGeneration === "auto") {
      return store.size <= 3;
    }

    return store.size <= 2;
  };

  static switchToLineModeIfCan = (ctx: Pick<EventsCtx, "store" | "options">) => {
    const { store, options } = ctx;

    const canBreakGeometry = Spatial.canBreakClosedGeometry(store, options);

    if (canBreakGeometry && store.isCircular()) {
      if (options.pointGeneration === "auto") {
        if (store.tail?.val?.isAuxiliary) {
          if (store.head) {
            store.head.next = store.tail;
            store.head.prev = null;
          }
          if (store.tail && store.tail.prev && store.head) {
            store.tail = store.tail.prev;
            store.tail.prev = store.head.next;
            store.tail.next = null;
          }
          if (store.head?.next) {
            store.head.next.next = store.tail;
            store.head.next.prev = store.head;
          }
        } else {
          if (store.head) {
            store.head.prev = null;
          }
          if (store.tail && store.head) {
            store.tail.prev = store.head.next;
            store.tail.next = null;
          }
        }
      } else {
        if (store.tail) {
          store.tail.next = null;
        }
        if (store.head) {
          store.head.prev = null;
        }
      }
      return true;
    }
    return false
  };
}

export const uuidv4 = (): Uuid => {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  function getRandomHexChar() {
    const hexChars = "0123456789abcdef";
    return hexChars[Math.floor(Math.random() * 16)];
  }

  function getUuidSection(length: number) {
    let section = "";
    for (let i = 0; i < length; i++) {
      section += getRandomHexChar();
    }
    return section;
  }

  function getUuidSectionSize(idx: number) {
    const firstElement = idx === 0;
    const lastElement = idx === 4;

    if (firstElement) {
      return 8;
    }
    if (lastElement) {
      return 12;
    }

    return 4;
  }

  const parts = [];
  for (let i = 0; i < 5; i++) {
    parts.push(getUuidSection(getUuidSectionSize(i)));
  }

  return parts.join("-") as Uuid;
};

export const throttle = (fn: (...args: any) => void, delay: number) => {
  let lastArgs: any;
  let shouldCall = true;

  function execute() {
    if (shouldCall && lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
      shouldCall = false;
      setTimeout(() => {
        shouldCall = true;
        execute();
      }, delay);
    }
  }

  return function (...args: any) {
    lastArgs = args;
    execute();
  };
};

export const debounce = (fn: (...args: any) => void, delay: number) => {
  let timeout: number;

  return function (...args: any) {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

export const disableButton = (button: HTMLButtonElement) => {
  button.setAttribute("disabled", "true");
  button.setAttribute("aria-disabled", "true");
};

export const enableButton = (button: HTMLButtonElement) => {
  button.removeAttribute("disabled");
  button.removeAttribute("aria-disabled");
};
