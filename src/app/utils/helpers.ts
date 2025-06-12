import type { AnyFunction } from "#app/types/helpers";
import type { Uuid } from "#app/types/index";

export const uuidv4 = (): Uuid => {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  function getRandomHexChar() {
    const hexChars = "0123456789abcdef";
    return hexChars[Math.floor(Math.random() * 16)];
  }

  function getUuidSection(length: number) {
    let section = "";
    for (let i = 0; i < length; i++) {
      section += getRandomHexChar();
    }
    return section;
  }

  function getUuidSectionSize(idx: number) {
    const firstElement = idx === 0;
    const lastElement = idx === 4;

    if (firstElement) {
      return 8;
    }
    if (lastElement) {
      return 12;
    }

    return 4;
  }

  const parts = [];
  for (let i = 0; i < 5; i++) {
    parts.push(getUuidSection(getUuidSectionSize(i)));
  }

  return parts.join("-") as Uuid;
};

export const throttle = (fn: AnyFunction, delay: number) => {
  let lastArgs: any;
  let shouldCall = true;

  function execute() {
    if (shouldCall && lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
      shouldCall = false;
      setTimeout(() => {
        shouldCall = true;
        execute();
      }, delay);
    }
  }

  return function (...args: any) {
    lastArgs = args;
    execute();
  };
};

export const debounce = (fn: AnyFunction, delay: number) => {
  let timeout: number;

  return function (...args: any) {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      fn(...args);
    }, delay);
  };
};
