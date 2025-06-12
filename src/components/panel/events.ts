import type { ButtonType, Step } from "#app/types/index";
import type { HTMLEvent } from "#app/types/helpers";
import { DOM } from "#app/dom";
import { Tooltip } from "#components/tooltip";
import { FireEvents } from "#components/map/fire-events";
import { timeline } from "#app/history";
import { renderer } from "#components/map/renderer";
import { linkedListToArray } from "#app/store/init";
import { View } from "./view";
import { Context } from ".";

export class Events {
  private tooltip: Tooltip;

  constructor(private readonly ctx: Context & { view: View }) {
    this.tooltip = new Tooltip();
  }

  public initEvents() {
    const undoButton = this.ctx.view.getButton("undo");

    if (undoButton) {
      DOM.addEventListener(undoButton, "click", this.onUndoClick);
      DOM.addEventListener(undoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(undoButton, "mouseleave", this.onMouseLeave);
    }

    const redoButton = this.ctx.view.getButton("redo");
    if (redoButton) {
      DOM.addEventListener(redoButton, "click", this.onRedoClick);
      DOM.addEventListener(redoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(redoButton, "mouseleave", this.onMouseLeave);
    }

    const deleteButton = this.ctx.view.getButton("delete");
    if (deleteButton) {
      DOM.addEventListener(deleteButton, "click", this.onRemoveAll);
      DOM.addEventListener(deleteButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(deleteButton, "mouseleave", this.onMouseLeave);
    }

    const saveButton = this.ctx.view.getButton("save");
    if (saveButton) {
      DOM.addEventListener(saveButton, "click", this.onSaveClick);
      DOM.addEventListener(saveButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  public removeEvents() {
    const undoButton = this.ctx.view.getButton("undo");
    if (undoButton) {
      DOM.removeEventListener(undoButton, "click", this.onUndoClick);
      DOM.removeEventListener(undoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(undoButton, "mouseleave", this.onMouseLeave);
    }
    const redoButton = this.ctx.view.getButton("redo");
    if (redoButton) {
      DOM.removeEventListener(redoButton, "click", this.onRedoClick);
      DOM.removeEventListener(redoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(redoButton, "mouseleave", this.onMouseLeave);
    }

    const deleteButton = this.ctx.view.getButton("delete");
    if (deleteButton) {
      DOM.removeEventListener(deleteButton, "click", this.onRemoveAll);
      DOM.removeEventListener(deleteButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(deleteButton, "mouseleave", this.onMouseLeave);
    }

    const saveButton = this.ctx.view.getButton("save");
    if (saveButton) {
      DOM.removeEventListener(saveButton, "click", this.onSaveClick);
      DOM.removeEventListener(saveButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  private getButtonLabel = (type: ButtonType) => {
    const { options } = this.ctx;

    const LABELS: Record<ButtonType, string> = {
      undo: options.locale.undo,
      redo: options.locale.redo,
      delete: options.locale.delete,
      save: options.locale.save,
    };

    return LABELS[type];
  };

  private onMouseEnter = (event: HTMLEvent<HTMLButtonElement>) => {
    const type = event.target.getAttribute("data-type") as ButtonType;
    if (type) {
      const label = this.getButtonLabel(type);

      this.tooltip
        .create({
          label,
          placement: "bottom",
        })
        .setPosition(this.tooltip.getPosition(event, "bottom"));
    }
  };

  private onMouseLeave = () => {
    this.tooltip.remove();
  };

  private onRemoveAll = (event: Event) => {
    const { mode, view, store, map } = this.ctx;
    store.reset();
    view.hide();
    mode.reset();
    this.tooltip.remove();
    timeline.resetStacks();
    renderer.resetGeometries();
    FireEvents.removeAllPoints(map, event);
  };

  private onUndoClick = (event: Event) => {
    const { store, map, view } = this.ctx;
    const hasSomethingToRedo = timeline.getRedoStackLength();

    // hasSomethingToRedo prevents from resetting the store when we still have something to redo and are trying to remove the last point by undoing
    if (store.size === 1 && hasSomethingToRedo) {
      store.reset();
      this.ctx.view.hide();
    } else {
      timeline.undo();
    }
    this.tooltip.remove();
    FireEvents.undo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    renderer.execute();
  };

  private onRedoClick = (event: Event) => {
    const { store, map } = this.ctx;

    timeline.redo();
    FireEvents.redo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    renderer.execute();
  };

  private onSaveClick = (event: Event) => {
    const { store, options } = this.ctx;

    FireEvents.onSaveClick(this.ctx, linkedListToArray(store.head), event);
    this.tooltip.remove();
    if (options.panel.buttons.save.clearOnSave) {
      this.onRemoveAll(event);
    }
  };
}
