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

export type Debounced<T extends AnyFunction> = ((...args: Parameters<T>) => void) & { cancel: () => void };

export const debounce = <T extends AnyFunction>(fn: T, delay: number): Debounced<T> => {
  let timeout = 0;

  const call = (...args: Parameters<T>) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => {
      timeout = 0;
      fn(...args);
    }, delay);
  };

  call.cancel = () => {
    window.clearTimeout(timeout);
    timeout = 0;
  };

  return call;
};

export type FrameCoalesced<T extends AnyFunction> = ((...args: Parameters<T>) => void) & { cancel: () => void };

export const coalesceToFrame = <T extends AnyFunction>(fn: T): FrameCoalesced<T> => {
  let pending: Parameters<T> | null = null;
  let frame = 0;

  const flush = () => {
    frame = 0;
    const args = pending;
    pending = null;
    if (args) fn(...args);
  };

  const call = (...args: Parameters<T>) => {
    pending = args;
    if (frame === 0) frame = window.requestAnimationFrame(flush);
  };

  call.cancel = () => {
    if (frame !== 0) window.cancelAnimationFrame(frame);
    frame = 0;
    pending = null;
  };

  return call;
};
