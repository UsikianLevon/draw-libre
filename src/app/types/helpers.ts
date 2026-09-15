export type AnyFunction = (...args: any) => any;
export type DeepRequired<T> = T extends AnyFunction
  ? T // function types pass through unchanged
  : {
      [K in keyof T]-?: DeepRequired<T[K]>;
    };

export type HTMLEvent<T extends HTMLElement> = Event & {
  target: T;
};

export type LiteralOrCustom<T> = T | (T extends string ? string & {} : number & {});
