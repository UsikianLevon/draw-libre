import type { ButtonType } from "#app/types/index";
import type { HTMLEvent } from "#app/types/helpers";
import { DOM } from "#app/dom";
import { Tooltip } from "#components/tooltip";
import { View } from "./view";
import { Context } from ".";
import { Actions } from "./actions";

export class Events {
  private tooltip: Tooltip;
  private actions: Actions | null = null;

  constructor(private readonly ctx: Context & { view: View }) {
    this.tooltip = new Tooltip();
    this.actions = new Actions(this.ctx);
  }

  private addButtonListeners(type: ButtonType, handler: (e: Event) => void): void {
    const btn = this.ctx.view.getButton(type);
    if (!btn) return;
    DOM.addEventListener(btn, "click", handler);
    DOM.addEventListener(btn, "mouseenter", this.onMouseEnter);
    DOM.addEventListener(btn, "mouseleave", this.onMouseLeave);
  }

  private removeButtonListeners(type: ButtonType, onClick: (e: Event) => void): void {
    const btn = this.ctx.view.getButton(type);
    if (!btn) return;
    DOM.removeEventListener(btn, "click", onClick);
    DOM.removeEventListener(btn, "mouseenter", this.onMouseEnter);
    DOM.removeEventListener(btn, "mouseleave", this.onMouseLeave);
  }

  public initEvents(): void {
    this.addButtonListeners("undo", this.onUndoClick);
    this.addButtonListeners("redo", this.onRedoClick);
    this.addButtonListeners("delete", this.onClearClick);
    this.addButtonListeners("save", this.onSaveClick);
  }

  public removeEvents(): void {
    this.removeButtonListeners("undo", this.onUndoClick);
    this.removeButtonListeners("redo", this.onRedoClick);
    this.removeButtonListeners("delete", this.onClearClick);
    this.removeButtonListeners("save", this.onSaveClick);
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

  private onMouseEnter = (event: Event) => {
    const target = event.target as HTMLElement;
    const type = target.getAttribute("data-type") as ButtonType;
    if (type) {
      const label = this.getButtonLabel(type);

      this.tooltip
        .create({
          label,
          placement: "bottom",
        })
        .setPosition(this.tooltip.getPosition(event as HTMLEvent<HTMLElement>, "bottom"));
    }
  };

  private onMouseLeave = () => {
    this.tooltip.remove();
  };

  private onUndoClick = (e: Event): void => {
    this.actions?.undo(e);
    this.tooltip.remove();
  };

  private onRedoClick = (e: Event): void => {
    this.actions?.redo(e);
    this.tooltip.remove();
  };

  private onClearClick = (e: Event): void => {
    this.actions?.clear(e);
    this.tooltip.remove();
  };

  private onSaveClick = (e: Event): void => {
    this.actions?.save(e);
    this.tooltip.remove();
  };

  public api() {
    return this.actions;
  }
}
