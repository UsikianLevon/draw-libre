import { ListNode } from "./index";
import { ChangeEvent } from "#app/observable";
import type { LatLng } from "#app/types/index";

interface EventData {
  STORE_MUTATED: {
    head: ListNode | null;
    tail: ListNode | null;
    size: number;
  };
  STORE_POINT_ADD: null;
  STORE_BREAK_GEOMETRY: {
    coords: LatLng;
  };
  STORE_CLOSE_GEOMETRY: null;
  STORE_CLEARED: null;
  STORE_INBETWEEN_POINT_REMOVED: {
    node: ListNode;
  };
  STORE_POINT_INSERTED: {
    node: ListNode["val"];
  };
  STORE_POINT_MOVED: {
    startPoint: ListNode;
    endPoint: ListNode;
  };
  STORE_AUX_TO_PRIMARY: {
    node: ListNode;
  };
}

export type StoreChangeEvent = ChangeEvent<EventData>;
export type StoreChangeEventKeys = keyof EventData;
