import type { RequiredDrawOptions } from "#app/types";
import type { ListNode, Store } from ".";

export class Circular {
  constructor(
    private store: Store,
    private readonly options?: RequiredDrawOptions,
  ) {
    this.store = store;
  }
  public isCircular = (): boolean => {
    const { head, tail } = this.store;
    if (!head || !tail) return false;

    return head === tail.next && tail === head.prev;
  };

  public canBreak = (): boolean => {
    const { size } = this.store;

    const threshold = this.options?.pointGeneration === "auto" ? 3 : 2;
    return size <= threshold;
  };

  public canClose = (): boolean => {
    const { size } = this.store;

    const storeSize = this.options?.pointGeneration === "auto" ? size > 3 : size > 2;
    return storeSize && !this.isCircular();
  };

  // breaking works differently depending on whether current is the auxiliary node or the primary node before it
  public break = (current: ListNode) => {
    if (!this.store.head) return;

    if (this.options?.pointGeneration === "auto") {
      // when current is auxiliary, tail steps back one node and head is the node after the aux point
      if (current.val?.isAuxiliary) {
        const auxId = current.val?.id as string;
        this.store.head = current.next as ListNode;
        this.store.tail = current.prev as ListNode;
        this.store.removeNodeById(auxId);
        this.store.head.prev = null;
        this.store.tail.next = null;
      } else {
        const auxId = current.next?.val?.id as string;
        // otherwise tail is current and head skips the aux point using next.next
        this.store.head = current.next?.next as ListNode;
        this.store.tail = current;
        this.store.removeNodeById(auxId);
        this.store.head.prev = null;
        this.store.tail.next = null;
      }
    } else {
      // without an aux node, tail is current and head is the next node
      this.store.head = current.next as ListNode;
      this.store.head.prev = null;
      this.store.tail = current;
      this.store.tail.next = null;
    }
  };

  public close = () => {
    const { head, tail } = this.store;
    if (!head || !tail) return;

    tail.next = head;
    head.prev = tail;
  };
}
