import { Command } from "#app/history";
import { Store } from "#app/store";
import { DrawingMode } from "#components/map/mode";

export class CloseGeometryCommand implements Command {
    type: string;

    constructor(private store: Store, private mode: DrawingMode) {
        this.type = "STORE_CLOSE_GEOMETRY";
    }

    execute = () => {
        // добавляем auxPoint в tail
        this.store.notify({ type: "STORE_CLOSE_GEOMETRY" });
        // закрываем геометрию
        if (this.store.tail?.val && this.store.head?.val) {
            this.store.tail.next = this.store.head;
            this.store.head.prev = this.store.tail;
        }
        this.mode.setClosedGeometry(true);
    }
    undo = () => {
        if (this.store.tail?.val && this.store.head?.val) {
            this.store.tail.next = null;
            this.store.head.prev = null;
        }
        this.mode.setClosedGeometry(false);
    }
}