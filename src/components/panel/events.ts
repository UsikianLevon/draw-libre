import { ListNode, StoreHelpers } from "#app/store/index";
import type { ButtonType, EventsCtx, Step, StepId } from "#app/types/index";
import type { HTMLEvent } from "#app/types/helpers";
import { DOM } from "#app/utils/dom";
import { Tooltip } from "#components/tooltip";
import { FireEvents } from "#components/map/helpers";
import { disableButton, enableButton } from "#app/utils/helpers";
import type { StoreChangeEvent } from "#app/store/types";
import type { DrawingModeChangeEvent } from "#components/map/mode/types";
import { timeline } from "#app/history";
import { TimelineChangeEvent } from "#app/history/types";

export class PanelEvents {
  private tooltip: Tooltip;

  constructor(private readonly ctx: EventsCtx) {
    this.tooltip = new Tooltip();
  }

  public initConsumers() {
    this.ctx.store.addObserver(this.onStoreChangeConsumer);
    this.ctx.mode?.addObserver(this.onMapModeConsumer);
    timeline.addObserver(this.timelineConsumer);
  }

  public removeConsumers() {
    this.ctx.store.removeObserver(this.onStoreChangeConsumer);
    this.ctx.mode?.removeObserver(this.onMapModeConsumer);
    timeline.removeObserver(this.timelineConsumer);
  }

  private timelineConsumer = (event: TimelineChangeEvent) => {
    const { type, data } = event;
    if (type === "REDO_STACK_CHANGED") {
      if (!data) {
        disableButton(this.ctx.panel.redoButton as HTMLButtonElement);
      } else {
        enableButton(this.ctx.panel.redoButton as HTMLButtonElement);
      }
    }

    if (type === "UNDO_STACK_CHANGED") {
      if (!data) {
        disableButton(this.ctx.panel.undoButton as HTMLButtonElement);
      } else {
        enableButton(this.ctx.panel.undoButton as HTMLButtonElement);
      }
    }
  };

  private onStoreChangeConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_MUTATED") {
      const { data } = event;
      if (data?.size === 0) {
        this.ctx.panel.hide();
      } else {
        let current = Object.assign({}, data);

        // TODO why the hell do we need a loop here? We don't like loops
        while (current.tail) {
          if (current.tail?.val?.isAuxiliary) {
            current.tail = current.tail?.prev;
          } else {
            if (current.tail?.val) {
              this.ctx.panel.setPanelLocation({
                lat: current.tail.val.lat,
                lng: current.tail.val.lng,
              });
            }
            break;
          }
        }
      }
    }
  };

  private onMapModeConsumer = (event: DrawingModeChangeEvent) => {
    const { store } = this.ctx;
    const { type, data } = event;
    if (type === "MODE_CHANGED" && !data) {
      this.ctx.panel.hide();
    }
    if (type === "MODE_CHANGED" && data) {
      if (store.tail?.val) {
        this.ctx.panel.setPanelLocation({
          lat: store.tail?.val?.lat,
          lng: store.tail?.val?.lng,
        });
      }
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const isMac = ((): boolean => {
      if ("userAgentData" in navigator) {
        return (navigator.userAgentData as any).platform === "macOS";
      }
      return navigator.userAgent.toLowerCase().includes("mac");
    })();

    const ctrl = isMac ? e.metaKey : e.ctrlKey;

    if (ctrl && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        this.onRedoClick(e);
      } else {
        this.onUndoClick(e);
      }
    }

    if (ctrl && e.key.toLowerCase() === "y") {
      e.preventDefault();
      this.onRedoClick(e);
    }
  };

  public initEvents() {
    const { panel } = this.ctx;

    document.addEventListener("keydown", this.onKeyDown);

    if (panel.undoButton) {
      DOM.addEventListener(panel.undoButton, "click", this.onUndoClick);
      DOM.addEventListener(panel.undoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(panel.undoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.redoButton) {
      DOM.addEventListener(panel.redoButton, "click", this.onRedoClick);
      DOM.addEventListener(panel.redoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(panel.redoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.deleteButton) {
      DOM.addEventListener(panel.deleteButton, "click", this.onRemoveAll);
      DOM.addEventListener(panel.deleteButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(panel.deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.saveButton) {
      DOM.addEventListener(panel.saveButton, "click", this.onSaveClick);
      DOM.addEventListener(panel.saveButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.addEventListener(panel.saveButton, "mouseleave", this.onMouseLeave);
    }
  }

  public removeEvents() {
    const { panel } = this.ctx;

    document.removeEventListener("keydown", this.onKeyDown);

    if (panel.undoButton) {
      DOM.removeEventListener(panel.undoButton, "click", this.onUndoClick);
      DOM.removeEventListener(panel.undoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(panel.undoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.deleteButton) {
      DOM.removeEventListener(panel.deleteButton, "click", this.onRemoveAll);
      DOM.removeEventListener(
        panel.deleteButton,
        "mouseenter",
        this.onMouseEnter as EventListenerOrEventListenerObject,
      );
      DOM.removeEventListener(panel.deleteButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.redoButton) {
      DOM.removeEventListener(panel.redoButton, "click", this.onRedoClick);
      DOM.removeEventListener(panel.redoButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(panel.redoButton, "mouseleave", this.onMouseLeave);
    }

    if (panel.saveButton) {
      DOM.removeEventListener(panel.saveButton, "click", this.onSaveClick);
      DOM.removeEventListener(panel.saveButton, "mouseenter", this.onMouseEnter as EventListenerOrEventListenerObject);
      DOM.removeEventListener(panel.saveButton, "mouseleave", this.onMouseLeave);
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
    const { renderer, mode, panel, store, map } = this.ctx;
    store.reset();
    panel.hide();
    mode.reset();
    this.tooltip.remove();
    timeline.resetStacks();
    renderer.resetGeometries();
    FireEvents.removeAllPoints(map, event);
  };

  private onUndoClick = (event: Event) => {
    const { store, map, renderer } = this.ctx;
    const hasSomethingToRedo = timeline.getRedoStackLength();

    // hasSomethingToRedo prevents from resetting the store when we still have something to redo and are trying to remove the last point by undoing
    if (store.size === 1 && hasSomethingToRedo) {
      store.reset();
      this.ctx.panel.hide();
    } else {
      timeline.undo();
      this.validateStructuredDoublyLinkedList(
        store.head,
        store.tail,
        store.map,
        "After UNDO",
        store.circular.isCircular(),
      );
    }
    this.tooltip.remove();
    FireEvents.undo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    renderer.execute();
  };

  private onRedoClick = (event: Event) => {
    const { store, map, renderer } = this.ctx;

    timeline.redo();
    FireEvents.redo({ ...(store.tail?.val as Step), total: store.size }, map, event);
    renderer.execute();
    this.validateStructuredDoublyLinkedList(
      store.head,
      store.tail,
      store.map,
      "After Redo",
      store.circular.isCircular(),
    );
  };

  validateStructuredDoublyLinkedList(
    head: ListNode | null,
    tail: ListNode | null,
    map: Map<StepId, ListNode>,
    label = "List",
    isCircular = false,
  ) {
    if (!head) {
      console.log(`${label}: ❌ Head is null`);
      return;
    }

    let current: ListNode | null = head;
    const visited = new Set<ListNode>();
    let index = 0;
    let isBroken = false;
    let detectedCycle = false;
    let expectPrimary = true;

    const trimId = (id: string | undefined) => (id ? id.slice(-4, -1) : "null");

    while (current) {
      const id = current.val?.id;
      const prev = current.prev as ListNode | null;
      const next = current.next as ListNode | null;
      const isAux = current.val?.isAuxiliary;

      // Цикл
      if (visited.has(current)) {
        if (isCircular && current === head) {
          detectedCycle = true;
          console.log(`${label}: 🔁 Proper circular reference detected at index ${index}`);
          break;
        } else {
          console.log(`${label}: ❌ Invalid cycle detected at index ${index}, node ID: ${trimId(id)}`);
          return;
        }
      }
      visited.add(current);

      // Ссылки
      if (next && next.prev !== current) {
        console.log(`${label}: ❌ Forward link broken at ${trimId(id)}`);
        isBroken = true;
      }
      if (prev && prev.next !== current) {
        console.log(`${label}: ❌ Backward link broken at ${trimId(id)}`);
        isBroken = true;
      }

      // Структура: PRIMARY → AUX
      if (expectPrimary && isAux) {
        console.log(`${label}: ❌ Expected PRIMARY, got AUX at ${trimId(id)}`);
        isBroken = true;
      } else if (!expectPrimary && !isAux) {
        console.log(`${label}: ❌ Expected AUXILIARY, got PRIMARY at ${trimId(id)}`);
        isBroken = true;
      }
      expectPrimary = !expectPrimary;

      // Первый узел не должен быть AUX
      if (index === 0 && isAux) {
        console.log(`${label}: ❌ First node is auxiliary, which is invalid`);
        isBroken = true;
      }

      // Проверка наличия в map
      if (!id || !map.has(id)) {
        console.log(`${label}: ❌ Node ID ${id ?? "undefined"} not found in map`);
        isBroken = true;
      } else if (map.get(id) !== current) {
        console.log(`${label}: ❌ Map mismatch for ID ${id} — different node instance`);
        isBroken = true;
      }

      console.log(
        `[${index}] ${trimId(prev?.val?.id)} ← ${trimId(id)} ${isAux ? "(AUX)" : "(PRIMARY)"} → ${trimId(next?.val?.id)}`,
      );

      current = current.next;
      index++;
    }

    // Проверка tail/head связей
    if (isCircular) {
      if (head.prev !== tail || tail?.next !== head) {
        console.log(`${label}: ❌ Circular structure broken: head.prev !== tail or tail.next !== head`);
        isBroken = true;
      } else if (!detectedCycle) {
        console.log(`${label}: ❌ Expected circular structure but did not detect cycle`);
        isBroken = true;
      }
    } else {
      if (head.prev !== null) {
        console.log(`${label}: ❌ head.prev is not null in non-circular list`);
        isBroken = true;
      }
      if (tail?.next !== null) {
        console.log(`${label}: ❌ tail.next is not null in non-circular list`);
        isBroken = true;
      }
    }

    // Проверка: все ключи из map должны быть в списке
    for (const [id, node] of map) {
      if (!visited.has(node)) {
        console.log(`${label}: ❌ Node from map (ID ${id}) is not present in linked list`);
        isBroken = true;
      }
    }

    if (!isBroken) {
      console.log(
        `${label}: ✅ ${isCircular ? "Circular" : "Linear"} doubly linked list is structurally correct with ${visited.size} nodes`,
      );
    }
  }

  private onSaveClick = (event: Event) => {
    const { store, options } = this.ctx;

    FireEvents.onSaveClick(this.ctx, StoreHelpers.toArray(store.head), event);
    this.tooltip.remove();
    if (options.panel.buttons.save.clearOnSave) {
      this.onRemoveAll(event);
    }
  };
}
