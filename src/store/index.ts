import type { Initial, LatLng, RequiredDrawOptions, Step, StepId } from "#types/index";
import { uuidv4 } from "#utils/helpers";
import { Observable } from "#utils/observable";

import { ERRORS } from "./errors";
import { StoreChangeEvent } from "./types";

export class ListNode {
  val: Step | null;
  next: ListNode | null;
  constructor(val: Step | null = null, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

export class Store extends Observable<StoreChangeEvent> {
  head: ListNode | null;
  tail: ListNode | null;
  size: number;

  constructor(options?: RequiredDrawOptions) {
    super();
    let list = StoreHelpers.initStore(options);

    this.head = list ? list.head : null;
    this.tail = list ? list.tail : null;
    this.size = list ? list.size : 0;
  }

  push(step: Step) {
    const newNode = new ListNode(step);
    if (!this.head) {
      this.head = this.tail = newNode;
    } else if (this.tail) {
      this.tail.next = newNode;
      this.tail = newNode;
    }
    this.size++;
    this.pingConsumers();
  }

  insert(step: Step, current: ListNode) {
    const newNode = new ListNode(step, current.next);
    const betweenHeadAndTail = this.tail === current && this.head === current.next;
    // If the point is inserted between head and tail, update the tail
    if (betweenHeadAndTail) {
      this.tail = newNode;
    }
    current.next = newNode;
    this.size++;
  }

  findStepById(id: StepId): ListNode["val"] | null {
    let current = this.head;
    const visitedNodes = new Set();
    while (current !== null) {
      if (visitedNodes.has(current)) {
        break;
      }
      if (current.val && current.val.id === id) {
        return current.val;
      }
      visitedNodes.add(current);
      current = current.next;
    }
    return null;
  }

  removeStepById(id: string): ListNode | null {
    if (!this.head) return null;
    let current = this.head;
    let prev: ListNode | null = null;
    while (current !== null) {
      if (current?.val?.id === id) {
        if (current === this.head) {
          this.head = current.next;
          if (this.tail) {
            this.tail.next = current.next;
          }
        } else {
          (prev as ListNode).next = current.next;
        }
        if (current === this.tail) {
          this.tail = prev;
        }
        this.size--;
        this.pingConsumers();

        return current;
      }

      prev = current;
      if (current.next) {
        current = current.next;
      }
    }

    return null;
  }

  reset() {
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.pingConsumers();
  }

  pingConsumers = () => {
    this.notify({
      type: "STORE_CHANGED",
      data: {
        head: this.head,
        tail: this.tail,
        size: this.size,
      },
    });
  };
}

export class StoreHelpers {
  static isLastPoint = (store: Store, id: StepId): boolean => {
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
      const { steps, closeGeometry, generateId } = options.initial;
      return StoreHelpers.fromArray(steps, closeGeometry, generateId);
    }

    return null;
  }

  static #generateIdForSteps = (stepsWithoutIds: LatLng[]): Step[] => {
    return stepsWithoutIds.map((step) => {
      return { ...step, id: uuidv4() };
    });
  };

  static buildStepSequence(steps: Step[]): Store {
    const list = new Store();
    steps.forEach((step) => {
      list.push(step);
    });
    return list;
  }

  static fromArray(
    initialSteps: Initial["steps"],
    closeGeometry: Initial["closeGeometry"],
    generateId: Initial["generateId"],
  ): Store | null {
    let steps = generateId ? this.#generateIdForSteps(initialSteps) : initialSteps;

    const list = this.buildStepSequence(steps as Step[]);

    if (closeGeometry && list.tail) {
      list.tail.next = list.head;
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
