type Func<T> = (event: T) => any;

export type ChangeEvent<T> = {
  [K in keyof T]: {
    type: K;
    data?: T[K];
  };
}[keyof T];

export class Observable<T> {
  observers: Set<Func<T>>;

  constructor() {
    this.observers = new Set<Func<T>>();
  }

  addObserver(observer: Func<T>) {
    this.observers.add(observer);
  }

  removeObserver(observer: Func<T>) {
    this.observers.delete(observer);
  }

  unsubscribe() {
    this.observers.clear();
  }

  notify(args: T) {
    this.observers.forEach((observer) => observer(args));
  }
}
