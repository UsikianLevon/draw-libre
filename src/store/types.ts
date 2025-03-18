import { ListNode } from "./index";
import { ChangeEvent } from "#utils/observable";

interface EventData {
  STORE_CHANGED: {
    head: ListNode | null;
    tail: ListNode | null;
    size: number;
  };
}

export type StoreChangeEvent = ChangeEvent<EventData>;
