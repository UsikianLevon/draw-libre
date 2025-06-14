import { LineEvents } from "../line";
import { PointEvents } from "../points";
import { TilesContext } from ".";

export class Events {
  private pointEvents: PointEvents;
  private lineEvents: LineEvents;

  constructor(private readonly ctx: TilesContext) {
    this.pointEvents = new PointEvents(this.ctx);
    this.lineEvents = new LineEvents(this.ctx);
    this.initEvents();
  }

  private initEvents = () => {
    this.lineEvents.init();
    this.pointEvents?.init();
  };

  public remove = () => {
    this.pointEvents?.remove();
    this.lineEvents?.remove();
  };
}
