import type { DrawOptions } from "../../src/index";

const FIXTURE_DEFAULT_OPTIONS: DrawOptions = { modes: { initial: "line" } };

export function withDefaults(options: DrawOptions = {}): DrawOptions {
  return {
    ...FIXTURE_DEFAULT_OPTIONS,
    ...options,
    modes: { ...FIXTURE_DEFAULT_OPTIONS.modes, ...options.modes },
  };
}
