import type { DrawOptions } from "../../src/index";

type PanelButtons = NonNullable<NonNullable<DrawOptions["panel"]>["buttons"]>;

export const ALL_PANEL_BUTTONS = {
  undo: { visible: true },
  redo: { visible: true },
  delete: { visible: true },
  save: { visible: true, clearOnSave: true },
} satisfies PanelButtons;

const FIXTURE_DEFAULT_OPTIONS: DrawOptions = { modes: { initial: "line" } };

export function withDefaults(options: DrawOptions = {}): DrawOptions {
  const buttons = options.panel?.buttons;
  return {
    ...FIXTURE_DEFAULT_OPTIONS,
    ...options,
    modes: { ...FIXTURE_DEFAULT_OPTIONS.modes, ...options.modes },
    panel: {
      ...options.panel,
      buttons: {
        undo: { ...ALL_PANEL_BUTTONS.undo, ...buttons?.undo },
        redo: { ...ALL_PANEL_BUTTONS.redo, ...buttons?.redo },
        delete: { ...ALL_PANEL_BUTTONS.delete, ...buttons?.delete },
        save: { ...ALL_PANEL_BUTTONS.save, ...buttons?.save },
      },
    },
  };
}
