import { ListNode } from "./index";
import { ChangeEvent } from "#utils/observable";

interface EventData {
  STORE_MUTATED: {
    head: ListNode | null;
    tail: ListNode | null;
    size: number;
  };
  STORE_DETACHED: null;
}

export type StoreChangeEvent = ChangeEvent<EventData>;
