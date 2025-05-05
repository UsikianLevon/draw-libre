import { ListNode } from "./index";
import { ChangeEvent } from "#app/utils/observable";

interface EventData {
  STORE_MUTATED: {
    head: ListNode | null;
    tail: ListNode | null;
    size: number;
  };
  STORE_BREAK_GEOMETRY: null;
  STORE_CLOSE_GEOMETRY: null;
  STORE_CLEARED: null;
  STORE_UNDO: { // the last node removed
    node: ListNode;
  };
  STORE_POINT_ADDED: {
    node: ListNode['val'];
  };
  STORE_POINT_INSERTED: {
    node: ListNode['val'];
  };
  STORE_REMOVED: { // random node removed
    node: ListNode;
  };
}

export type StoreChangeEvent = ChangeEvent<EventData>;
export type StoreChangeEventKeys = keyof EventData;
