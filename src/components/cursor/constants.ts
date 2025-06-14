export const CURSORS = {
  AUTO: "auto",
  DEFAULT: "default",
  POINTER: "pointer",
  CROSSHAIR: "crosshair",
  MOVE: "move",
  HELP: "help",
  GRAB: "grab",
  GRABBING: "grabbing",
} as const;

export type TCursor = (typeof CURSORS)[keyof typeof CURSORS];
