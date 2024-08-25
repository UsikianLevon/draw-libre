type AnyFunction = (...args: any[]) => any;
export type DeepRequired<T> = T extends AnyFunction
  ? T // if T is a function, return it
  : {
      [K in keyof T]-?: DeepRequired<T[K]>;
    };

export type HTMLEvent<T extends HTMLElement> = Event & {
  target: T;
};
