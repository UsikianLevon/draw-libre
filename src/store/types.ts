import { ListNode } from "./index";
import { ChangeEvent } from "#utils/observable";

export type Mode = "line" | "polygon";
interface EventData {
  STORE_CHANGED: {
    head: ListNode | null;
    tail: ListNode | null;
    size: number;
  };
}

export type StoreChangeEvent = ChangeEvent<EventData>;
