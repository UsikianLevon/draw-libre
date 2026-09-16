export interface DrawLibreSubscription {
  unsubscribe(): void;
}

type Listener<T> = (event: T) => void;

type Registration = { listener: Listener<never>; once: boolean; delivered: boolean };

export class Emitter<Events extends object> {
  private readonly listeners = new Map<keyof Events, Map<Listener<never>, Registration>>();

  on = <T extends keyof Events>(type: T, listener: Listener<Events[T]>): DrawLibreSubscription =>
    this.add(type, listener, false);

  once = <T extends keyof Events>(type: T, listener: Listener<Events[T]>): DrawLibreSubscription =>
    this.add(type, listener, true);

  off = <T extends keyof Events>(type: T, listener: Listener<Events[T]>): void => {
    this.listeners.get(type)?.delete(listener as Listener<never>);
  };

  emit = <T extends keyof Events>(type: T, event: Events[T]): void => {
    const registered = this.listeners.get(type);
    if (!registered) return;
    for (const registration of [...registered.values()]) {
      // a nested emit may have delivered this once registration already
      if (registration.delivered) continue;
      if (registration.once) {
        registration.delivered = true;
        if (registered.get(registration.listener) === registration) registered.delete(registration.listener);
      }
      registration.listener(event as never);
    }
  };

  private add<T extends keyof Events>(type: T, listener: Listener<Events[T]>, once: boolean): DrawLibreSubscription {
    let registered = this.listeners.get(type);
    if (!registered) {
      registered = new Map();
      this.listeners.set(type, registered);
    }
    const key = listener as Listener<never>;
    const current = registered.get(key);
    if (!current || !once) registered.set(key, { listener: key, once, delivered: false });
    return { unsubscribe: () => this.off(type, listener) };
  }
}
