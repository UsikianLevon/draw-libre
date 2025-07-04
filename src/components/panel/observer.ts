import type { LatLng } from "#app/types/index";
import type { StoreChangeEvent } from "#app/store/types";
import type { DrawingModeChangeEvent } from "#components/map/mode/types";
import { DOM } from "#app/dom";
import { timeline } from "#app/history";
import { TimelineChangeEvent } from "#app/history/types";
import { Context } from ".";
import { View } from "./view";

export class Observer {
  constructor(private readonly ctx: Context & { view: View; setPanelLocation: (coordinates: LatLng) => void }) {}

  public initConsumers() {
    this.ctx.store.addObserver(this.onStoreChangeConsumer);
    this.ctx.mode?.addObserver(this.onMapModeConsumer);
    timeline.addObserver(this.onTimelineChangeConsumer);
  }

  public removeConsumers() {
    this.ctx.store.removeObserver(this.onStoreChangeConsumer);
    this.ctx.mode?.removeObserver(this.onMapModeConsumer);
    timeline.removeObserver(this.onTimelineChangeConsumer);
  }

  private onTimelineChangeConsumer = (event: TimelineChangeEvent) => {
    const { type, data } = event;
    if (type === "REDO_STACK_CHANGED") {
      if (!data) {
        DOM.disableButton(this.ctx.view.getButton("redo"));
      } else {
        DOM.enableButton(this.ctx.view.getButton("redo"));
      }
    }

    if (type === "UNDO_STACK_CHANGED") {
      if (!data) {
        DOM.disableButton(this.ctx.view.getButton("undo"));
      } else {
        DOM.enableButton(this.ctx.view.getButton("undo"));
      }
    }
  };

  private onStoreChangeConsumer = (event: StoreChangeEvent) => {
    if (event.type === "STORE_MUTATED") {
      const { data } = event;
      if (data?.size === 0) {
        this.ctx.view.hide();
      } else {
        let current = Object.assign({}, data);

        // TODO why the hell do we need a loop here? We don't like loops
        while (current.tail) {
          if (current.tail?.val?.isAuxiliary) {
            current.tail = current.tail?.prev;
          } else {
            if (current.tail?.val) {
              this.ctx.setPanelLocation({
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
      this.ctx.view.hide();
    }
    if (type === "MODE_CHANGED" && data) {
      if (this.ctx.store.circular.isCircular()) {
        if (this.ctx.options.pointGeneration === "auto") {
          if (store.tail?.prev?.val) {
            this.ctx.setPanelLocation({
              lat: store.tail.prev.val.lat,
              lng: store.tail.prev.val.lng,
            });
          }
        } else {
          if (store.tail?.val) {
            this.ctx.setPanelLocation({
              lat: store.tail.val.lat,
              lng: store.tail.val.lng,
            });
          }
        }
      } else {
        if (store.tail?.val) {
          this.ctx.setPanelLocation({
            lat: store.tail.val.lat,
            lng: store.tail.val.lng,
          });
        }
      }
    }
  };
}
