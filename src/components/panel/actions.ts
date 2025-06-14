import { timeline } from "#app/history";
import { linkedListToArray } from "#app/store/init";
import { Step } from "#app/types";
import { FireEvents } from "#components/map/fire-events";
import { renderer } from "#components/map/renderer";
import { Context } from ".";
import { View } from "./view";

export class Actions {
  constructor(private readonly ctx: Context & { view: View }) {}

  public clear = (event?: Event) => {
    const { mode, view, store, map } = this.ctx;
    store.reset();
    view.hide();
    mode.reset();
    timeline.resetStacks();
    renderer.resetGeometries();
    if (event) {
      FireEvents.removeAllPoints(map, event);
    }
    renderer.execute();
  };

  public undo = (event?: Event) => {
    const { store, map, view } = this.ctx;
    const hasSomethingToRedo = timeline.getRedoStackLength();

    // hasSomethingToRedo prevents from resetting the store when we still have something to redo and are trying to remove the last point by undoing
    if (store.size === 1 && hasSomethingToRedo) {
      store.reset();
      view.hide();
    } else {
      timeline.undo();
    }
    if (event) {
      FireEvents.undo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    }
    renderer.execute();
  };

  public redo = (event?: Event) => {
    const { store, map } = this.ctx;

    timeline.redo();
    if (event) {
      FireEvents.redo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    }
    renderer.execute();
  };

  public save = (event?: Event) => {
    const { store, options } = this.ctx;

    if (event) {
      FireEvents.onSaveClick(this.ctx, linkedListToArray(store.head), event);
    }
    if (options.panel.buttons.save.clearOnSave) {
      this.clear(event);
    }
    renderer.execute();
  };
}
