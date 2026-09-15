export const DRAW_EVENTS = [
  "mdl:add",
  "mdl:pointremove",
  "mdl:pointenter",
  "mdl:pointleave",
  "mdl:moveend",
  "mdl:undo",
  "mdl:redo",
  "mdl:removeall",
  "mdl:save",
  "mdl:modechanged",
  "mdl:undostackchanged",
  "mdl:redostackchanged",
  "mdl:break",
] as const;

export type DrawEventName = (typeof DRAW_EVENTS)[number];

export type RecordedPayload = { type: DrawEventName; hasOriginalEvent: boolean } & Record<string, unknown>;

export function serializePayload(event: Record<string, unknown>): string {
  const { target, originalEvent, ...rest } = event;
  void target;
  return JSON.stringify({ ...rest, hasOriginalEvent: originalEvent !== undefined });
}
