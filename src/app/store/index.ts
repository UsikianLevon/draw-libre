import type { RequiredDrawOptions, Step, StepId } from "#app/types/index";
import { Observable } from "#app/observable";

import { StoreChangeEvent } from "./types";
import { Circular } from "./circular";
import { initStore } from "./init";

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
  public readonly circular: Circular;

  constructor(private readonly options?: RequiredDrawOptions) {
    super();
    let list = initStore(this.options);
    this.circular = new Circular(this, this.options);
    this.map = list ? list.map : new Map<StepId, ListNode>();
    this.head = list ? list.head : null;
    this.tail = list ? list.tail : null;
    this.size = list ? list.size : 0;
  }

  push = (step: Step) => {
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
    return newNode;
  };

  public unshift = (step: Step) => {
    const newNode = new ListNode(step);

    newNode.next = this.head;
    this.head = newNode;

    if (this.circular.isCircular() && this.tail) {
      this.tail.next = newNode;
      newNode.prev = this.tail;
    }

    this.map.set(step.id, newNode);
    this.size++;
    this.pingConsumers();
  };

  public insertAfter = (node: ListNode, stepToInsert: Step) => {
    if (!node) return null;

    const newNode = new ListNode(stepToInsert);
    newNode.prev = node;
    newNode.next = node.next;

    const betweenHeadAndTail = this.tail === node && this.head === node.next;
    if (betweenHeadAndTail) {
      this.tail = newNode;
      this.head!.prev = newNode;
    }

    if (node.next) {
      node.next.prev = newNode;
    }

    node.next = newNode;
    this.map.set(stepToInsert.id, newNode);
    this.size++;
    this.pingConsumers();
    return newNode;
  };

  public removeNodeById(id: StepId): ListNode | null {
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

  public findStepById(id: StepId): ListNode["val"] | null {
    const node = this.map.get(id);
    return node ? node.val : null;
  }

  public findNodeById(id: StepId): ListNode | null {
    const node = this.map.get(id);
    return node ? node : null;
  }

  public isLastPoint = (options: RequiredDrawOptions, id: StepId): boolean => {
    if (options.pointGeneration === "auto" && this.tail?.next === this.head) {
      return this.tail?.prev?.val?.id === id;
    }
    return this.tail?.val?.id === id;
  };

  public reset = () => {
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.map.clear();
    this.notify({
      type: "STORE_CLEARED",
    });
  };

  public pingConsumers = () => {
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
