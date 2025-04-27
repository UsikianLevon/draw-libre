import { PointHelpers } from "#components/map/points/helpers";
import type { Initial, LatLng, RequiredDrawOptions, Step, StepId } from "#types/index";
import { uuidv4 } from "#utils/helpers";
import { Observable } from "#utils/observable";

import { ERRORS } from "./errors";
import { StoreChangeEvent } from "./types";

export class ListNode {
  val: Step | null;
  prev: ListNode | null;
  next: ListNode | null;
  constructor(val: Step | null = null, next: ListNode | null = null, prev: ListNode | null = null) {
    this.val = val;
    this.prev = prev;
    this.next = next;
  }
}

export class Store extends Observable<StoreChangeEvent> {
  head: ListNode | null;
  tail: ListNode | null;
  size: number;
  map: Map<StepId, ListNode>;

  constructor(options?: RequiredDrawOptions) {
    super();
    let list = StoreHelpers.initStore(options);
    this.map = list ? list.map : new Map<StepId, ListNode>();
    this.head = list ? list.head : null;
    this.tail = list ? list.tail : null;
    this.size = list ? list.size : 0;
  }

  push(step: Step) {
    const newNode = new ListNode(step);
    if (!this.head) {
      this.head = this.tail = newNode;
    } else if (this.tail) {
      newNode.prev = this.tail;
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.map.set(step.id, newNode);
    this.size++;
    this.pingConsumers();
  }

  insert(step: Step, current: ListNode) {
    if (!current) return;
    const newNode = new ListNode(step);
    newNode.prev = current;
    newNode.next = current.next;

    const betweenHeadAndTail = this.tail === current && this.head === current.next;
    if (betweenHeadAndTail) {
      this.tail = newNode;
    }

    if (current.next) {
      current.next.prev = newNode;
    }

    current.next = newNode;
    this.map.set(step.id, newNode);
    this.size++;
    this.pingConsumers();
  }

  findStepById(id: StepId): ListNode["val"] | null {
    const node = this.map.get(id);
    return node ? node.val : null;
  }

  findNodeById(id: StepId): ListNode | null {
    const node = this.map.get(id);
    return node ? node : null;
  }

  removeNodeById(id: StepId): ListNode | null {
    const node = this.map.get(id);
    if (!node) return null;

    if (this.size === 1) {
      this.head = null;
      this.tail = null;
    } else {
      if (node.prev) {
        node.prev.next = node.next;
      }

      if (node.next) {
        node.next.prev = node.prev;
      }

      if (node === this.head) {
        this.head = node.next;
        if (this.head?.prev && this.tail) this.tail.next = this.head;
      }

      if (node === this.tail) {
        this.tail = node.prev;
        if (this.head && this.tail?.next) this.head.prev = this.tail;
      }
    }

    this.map.delete(id);
    this.size--;
    this.pingConsumers();

    return node;
  }

  reset() {
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.map.clear();
    this.pingConsumers();
  }

  pingConsumers = () => {
    this.notify({
      type: "STORE_MUTATED",
      data: {
        head: this.head,
        tail: this.tail,
        size: this.size,
      },
    });
  };
}

export class StoreHelpers {
  static isLastPoint = (store: Store, options: RequiredDrawOptions, id: StepId): boolean => {
    if (options.pointGeneration === "auto" && store.tail?.next === store.head) {
      return store.tail?.prev?.val?.id === id;
    }
    return store.tail?.val?.id === id;
  };

  static initStore(options?: RequiredDrawOptions): Store | null {
    if (!options?.initial) return null;

    const emptyInitialOptions = options && options.initial && !options.initial.steps.length;
    if (emptyInitialOptions) {
      throw new Error(ERRORS["EMPTY_INITIAL_STATE"]);
    }

    const initialOptionsProvided = options && options.initial.steps;
    if (initialOptionsProvided) {
      return StoreHelpers.fromArray(options.initial, options.pointGeneration);
    }

    return null;
  }

  static #generateIdForSteps = (stepsWithoutIds: LatLng[]): Step[] => {
    return stepsWithoutIds.map((step, idx) => {
      return { ...step, isAuxiliary: false, isFirst: idx === 0, id: uuidv4() };
    });
  };

  static buildStepSequence(
    initialSteps: Step[],
    closeGeometry: Initial["closeGeometry"],
    pointGeneration: RequiredDrawOptions["pointGeneration"],
  ): Store {
    const list = new Store();
    const steps = closeGeometry ? initialSteps.slice(0, -1) : initialSteps;

    steps.forEach((step, idx) => {
      list.push(step);

      // if we are at the end of the array and there's no next point
      // we need to create an auxiliary point with the first point
      // to close the geometry
      if (pointGeneration === "auto") {
        const isNextPointAvailable = steps[idx + 1];
        if (isNextPointAvailable) {
          const auxPoint = PointHelpers.createAuxiliaryPoint(step, steps[idx + 1] as Step);
          list.push(auxPoint);
        } else if (closeGeometry) {
          const auxPoint = PointHelpers.createAuxiliaryPoint(step, steps[0] as Step);
          list.push(auxPoint);
        }
      }
    });
    return list;
  }

  static fromArray(initialOptions: Initial, pointGeneration: RequiredDrawOptions["pointGeneration"]): Store | null {
    const { steps: initialSteps, closeGeometry, generateId } = initialOptions;
    const steps = generateId ? this.#generateIdForSteps(initialSteps) : initialSteps;
    const list = this.buildStepSequence(steps as Step[], closeGeometry, pointGeneration);

    if (closeGeometry && list.tail && list.head) {
      list.tail.next = list.head;
      list.head.prev = list.tail;
    }
    return list;
  }

  static toArray(head: ListNode | null): Step[] {
    if (!head) return [];

    const visitedNodes = new Set<ListNode>();
    const result: Step[] = [];

    let current: ListNode | null = head;
    while (current !== null) {
      if (visitedNodes.has(current)) break;

      visitedNodes.add(current);
      result.push(current.val as Step);
      current = current.next;
    }

    return result;
  }
}
