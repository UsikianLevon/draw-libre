import { expect, test, vi } from "vitest";

import { Emitter } from "./emitter";

type Events = { ping: { value: number }; pong: { text: string } };

test("a listener hears every emit of its type and nothing of other types", () => {
  const emitter = new Emitter<Events>();
  const ping = vi.fn();

  emitter.on("ping", ping);
  emitter.emit("ping", { value: 1 });
  emitter.emit("pong", { text: "a" });
  emitter.emit("ping", { value: 2 });

  expect(ping.mock.calls).toEqual([[{ value: 1 }], [{ value: 2 }]]);
});

test("unsubscribe stops a listener and can be called twice", () => {
  const emitter = new Emitter<Events>();
  const ping = vi.fn();

  const subscription = emitter.on("ping", ping);
  subscription.unsubscribe();
  subscription.unsubscribe();
  emitter.emit("ping", { value: 1 });

  expect(ping).not.toHaveBeenCalled();
});

test("once hears a single emit", () => {
  const emitter = new Emitter<Events>();
  const ping = vi.fn();

  emitter.once("ping", ping);
  emitter.emit("ping", { value: 1 });
  emitter.emit("ping", { value: 2 });

  expect(ping.mock.calls).toEqual([[{ value: 1 }]]);
});

test("off removes a listener added with on and one added with once", () => {
  const emitter = new Emitter<Events>();
  const regular = vi.fn();
  const single = vi.fn();

  emitter.on("ping", regular);
  emitter.once("ping", single);
  emitter.off("ping", regular);
  emitter.off("ping", single);
  emitter.emit("ping", { value: 1 });

  expect(regular).not.toHaveBeenCalled();
  expect(single).not.toHaveBeenCalled();
});

test("the same listener added twice is called once per emit", () => {
  const emitter = new Emitter<Events>();
  const ping = vi.fn();

  emitter.on("ping", ping);
  emitter.on("ping", ping);
  emitter.emit("ping", { value: 1 });

  expect(ping).toHaveBeenCalledTimes(1);
});

test("a listener added during an emit waits for the next emit", () => {
  const emitter = new Emitter<Events>();
  const late = vi.fn();

  emitter.on("ping", () => {
    emitter.on("ping", late);
  });
  emitter.emit("ping", { value: 1 });

  expect(late).not.toHaveBeenCalled();

  emitter.emit("ping", { value: 2 });

  expect(late.mock.calls).toEqual([[{ value: 2 }]]);
});

test("listeners run in the order they were added", () => {
  const emitter = new Emitter<Events>();
  const order: string[] = [];

  emitter.on("ping", () => order.push("first"));
  emitter.on("ping", () => order.push("second"));
  emitter.emit("ping", { value: 1 });

  expect(order).toEqual(["first", "second"]);
});

test("once fires a single time even when an earlier listener emits the same type", () => {
  const emitter = new Emitter<Events>();
  const single = vi.fn();
  let nested = false;

  emitter.on("ping", () => {
    if (nested) return;
    nested = true;
    emitter.emit("ping", { value: 2 });
  });
  emitter.once("ping", single);
  emitter.emit("ping", { value: 1 });

  expect(single.mock.calls).toEqual([[{ value: 2 }]]);
});

test("a listener subscribed again during an emit is not removed by a stale once registration", () => {
  const emitter = new Emitter<Events>();
  const calls: number[] = [];
  const listener = (event: Events["ping"]) => calls.push(event.value);

  emitter.once("ping", () => {
    emitter.off("ping", listener);
    emitter.on("ping", listener);
  });
  emitter.once("ping", listener);

  emitter.emit("ping", { value: 1 });
  emitter.emit("ping", { value: 2 });

  expect(calls).toEqual([1, 2]);
});

test("a listener that throws stops the listeners after it", () => {
  const emitter = new Emitter<Events>();
  const after = vi.fn();

  emitter.on("ping", () => {
    throw new Error("listener failure");
  });
  emitter.on("ping", after);

  expect(() => emitter.emit("ping", { value: 1 })).toThrow("listener failure");
  expect(after).not.toHaveBeenCalled();
});
