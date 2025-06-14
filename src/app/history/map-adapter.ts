import type { UnifiedMap } from "#app/types/map";
import { EVENTS } from "#app/utils/constants";
import { FireEvents } from "#components/map/fire-events";
import { timeline } from ".";
import type { TimelineChangeEvent } from "./types";

export class MapTimelineAdapter {
  constructor(private map: UnifiedMap) {
    this.init();
  }

  private init() {
    timeline.addObserver(this.onTimelineEvent);
  }

  public destroy() {
    timeline.removeObserver(this.onTimelineEvent);
  }

  private onTimelineEvent = (evt: TimelineChangeEvent) => {
    switch (evt.type) {
      case "UNDO_STACK_CHANGED":
        FireEvents.onUndoStackChange(this.map, evt.data);
        break;
      case "REDO_STACK_CHANGED":
        FireEvents.onRedoStackChange(this.map, evt.data);
        break;
    }
  };
}
