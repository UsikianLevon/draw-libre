import { expect, test } from "vitest";

import { Emitter } from "#app/events/emitter";
import type { EngineMap } from "#app/types/engine";

import { FireEvents } from "./fire-events";
import type { DrawLibreEventType } from "./types";

test("a throwing map listener stops the instance channel and drops what it queued", () => {
  const emitter = new Emitter<DrawLibreEventType>();
  const heard: string[] = [];
  emitter.on("mdl:break", () => heard.push("mdl:break"));
  emitter.on("mdl:undostackchanged", () => heard.push("mdl:undostackchanged"));
  FireEvents.bind(emitter);

  try {
    const fired: string[] = [];
    const map = {
      fire: (type: string) => {
        fired.push(type);
        if (type === "mdl:break") {
          FireEvents.onUndoStackChange(map as unknown as EngineMap, 1);
          throw new Error("listener failure");
        }
      },
    };

    expect(() => FireEvents.onLineBreak(map as unknown as EngineMap)).toThrow("listener failure");
    expect(fired).toEqual(["mdl:break"]);
    expect(heard).toEqual([]);

    FireEvents.onUndoStackChange(map as unknown as EngineMap, 2);

    expect(fired).toEqual(["mdl:break", "mdl:undostackchanged"]);
    expect(heard).toEqual(["mdl:undostackchanged"]);
  } finally {
    FireEvents.unbind(emitter);
  }
});
