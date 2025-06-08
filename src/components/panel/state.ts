import type { LatLng } from "#app/types";

export class UIState {
  private _isHidden = true;
  private _anchor = { dx: 0, dy: 0 };
  private _pendingCoord: LatLng | null = null;
  private _rafId = 0;
  private _listenersActive = false;

  get isHidden() {
    return this._isHidden;
  }
  set isHidden(value: boolean) {
    this._isHidden = value;
  }

  get anchor() {
    return { ...this._anchor };
  }
  set anchor(value: { dx: number; dy: number }) {
    this._anchor = { ...value };
  }

  get pendingCoord() {
    return this._pendingCoord;
  }
  set pendingCoord(value: LatLng | null) {
    this._pendingCoord = value;
  }

  get rafId() {
    return this._rafId;
  }
  set rafId(id: number) {
    this._rafId = id;
  }

  get listenersActive() {
    return this._listenersActive;
  }
  set listenersActive(value: boolean) {
    this._listenersActive = value;
  }

  reset() {
    this._isHidden = true;
    this._anchor = { dx: 0, dy: 0 };
    this._pendingCoord = null;
    this._rafId = 0;
    this._listenersActive = false;
  }
}
