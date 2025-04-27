import { Observable } from "#utils/observable";
import { MouseEventsChangeEvent } from "./types";

export class MouseEvents extends Observable<MouseEventsChangeEvent> {
  #firstPointMouseEnter: boolean;
  #firstPointMouseLeave: boolean;
  #lastPointMouseClick: boolean;
  #lastPointMouseUp: boolean;
  #lastPointMouseEnter: boolean;
  #lastPointMouseLeave: boolean;
  #pointMouseDown: boolean;
  #pointMouseUp: boolean;
  #pointMouseEnter: boolean;
  #pointMouseLeave: boolean;
  #lineMouseEnter: boolean;
  #lineMouseLeave: boolean;

  constructor() {
    super();
    this.#firstPointMouseEnter = false;
    this.#firstPointMouseLeave = false;
    this.#lastPointMouseClick = false;
    this.#lastPointMouseUp = false;
    this.#lastPointMouseEnter = false;
    this.#lastPointMouseLeave = false;
    this.#pointMouseDown = false;
    this.#pointMouseUp = false;
    this.#pointMouseEnter = false;
    this.#pointMouseLeave = false;
    this.#lineMouseEnter = false;
    this.#lineMouseLeave = false;
  }

  get firstPointMouseEnter() {
    return this.#firstPointMouseEnter;
  }
  set firstPointMouseEnter(value) {
    this.#firstPointMouseEnter = value;
    this.notify({
      type: "firstPointMouseEnter",
      data: value,
    });
  }

  get firstPointMouseLeave() {
    return this.#firstPointMouseLeave;
  }
  set firstPointMouseLeave(value) {
    this.#firstPointMouseLeave = value;
    this.notify({
      type: "firstPointMouseLeave",
      data: value,
    });
  }

  get lastPointMouseClick() {
    return this.#lastPointMouseClick;
  }
  set lastPointMouseClick(value) {
    this.#lastPointMouseClick = value;
    this.notify({
      type: "lastPointMouseClick",
      data: value,
    });
  }

  get lastPointMouseUp() {
    return this.#lastPointMouseUp;
  }
  set lastPointMouseUp(value) {
    this.#lastPointMouseUp = value;
    this.notify({
      type: "lastPointMouseUp",
      data: value,
    });
  }

  get lastPointMouseEnter() {
    return this.#lastPointMouseEnter;
  }
  set lastPointMouseEnter(value) {
    this.#lastPointMouseEnter = value;
    this.notify({
      type: "lastPointMouseEnter",
      data: value,
    });
  }

  get lastPointMouseLeave() {
    return this.#lastPointMouseLeave;
  }
  set lastPointMouseLeave(value) {
    this.#lastPointMouseLeave = value;
    this.notify({
      type: "lastPointMouseLeave",
      data: value,
    });
  }

  get pointMouseDown() {
    return this.#pointMouseDown;
  }
  set pointMouseDown(value) {
    this.#pointMouseDown = value;
    this.notify({
      type: "pointMouseDown",
      data: value,
    });
  }

  get pointMouseUp() {
    return this.#pointMouseUp;
  }
  set pointMouseUp(value) {
    this.#pointMouseUp = value;
    this.notify({
      type: "pointMouseUp",
      data: value,
    });
  }

  get pointMouseEnter() {
    return this.#pointMouseEnter;
  }
  set pointMouseEnter(value) {
    this.#pointMouseEnter = value;
    this.notify({
      type: "pointMouseEnter",
      data: value,
    });
  }

  get pointMouseLeave() {
    return this.#pointMouseLeave;
  }
  set pointMouseLeave(value) {
    this.#pointMouseLeave = value;
    this.notify({
      type: "pointMouseLeave",
      data: value,
    });
  }

  get lineMouseEnter() {
    return this.#lineMouseEnter;
  }

  set lineMouseEnter(value) {
    this.#lineMouseEnter = value;
    this.notify({
      type: "lineMouseEnter",
      data: value,
    });
  }

  get lineMouseLeave() {
    return this.#lineMouseLeave;
  }

  set lineMouseLeave(value) {
    this.#lineMouseLeave = value;
    this.notify({
      type: "lineMouseLeave",
      data: value,
    });
  }
}
