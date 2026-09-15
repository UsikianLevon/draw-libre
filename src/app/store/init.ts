import { uuidv4 } from "#app/utils/helpers";
import type { Initial, LatLng, RequiredDrawOptions, Step } from "#app/types/index";
import { PointHelpers } from "#components/map/points/helpers";

import { ListNode, Store } from ".";

export const ERRORS = {
  EMPTY_INITIAL_STATE:
    "You passed an empty initial array in the options. Please either remove the 'initial' property or include at least one element in the array.",
  MISSING_IDS:
    "You set 'generateId' to false but did not provide IDs for all steps. Please ensure all steps have IDs or set 'generateId' to true.",
  NOT_ENOUGH_POINTS_TO_CLOSE:
    "At least three points are required to close a polygon or a line. Please add more points or set 'closeGeometry' to false.",
  FIRST_LAST_POINT_NOT_EQUAL:
    "The first and last points of a polygon or a closed linestring must be the same. Please ensure the first and last points are equal or set 'closeGeometry' to false.",
};

function buildStepSequence(
  store: Store,
  initialSteps: Step[],
  closeGeometry: Initial["closeGeometry"],
  pointGeneration: RequiredDrawOptions["pointGeneration"],
): Store {
  const steps = closeGeometry ? initialSteps.slice(0, -1) : initialSteps;

  steps.forEach((step, idx) => {
    store.push(step);

    // the last step without a next point gets an auxiliary point back to the first step, closing the geometry
    if (pointGeneration === "auto") {
      const isNextPointAvailable = steps[idx + 1];
      if (isNextPointAvailable) {
        const auxPoint = PointHelpers.createAuxiliaryPoint(step, steps[idx + 1] as Step);
        store.push(auxPoint);
      } else if (closeGeometry) {
        const auxPoint = PointHelpers.createAuxiliaryPoint(step, steps[0] as Step);
        store.push(auxPoint);
      }
    }
  });

  return store;
}

function prepareSteps(steps: (Step | LatLng)[]): Step[] {
  return steps.map((step, idx) => {
    const id = "id" in step && step.id !== undefined ? step.id : uuidv4();
    return { ...step, isAuxiliary: false, isFirst: idx === 0, id };
  });
}

function fromArray(initialOptions: Initial, pointGeneration: RequiredDrawOptions["pointGeneration"]): Store | null {
  const { steps: initialSteps, closeGeometry } = initialOptions;
  const steps = prepareSteps(initialSteps);
  const list = buildStepSequence(new Store(), steps, closeGeometry, pointGeneration);

  if (closeGeometry && list.tail && list.head) {
    list.tail.next = list.head;
    list.head.prev = list.tail;
  }
  return list;
}

export function appendOpenSteps(
  store: Store,
  steps: (Step | LatLng)[],
  pointGeneration: RequiredDrawOptions["pointGeneration"],
) {
  buildStepSequence(store, prepareSteps(steps), false, pointGeneration);
}

export function initStore(options?: RequiredDrawOptions): Store | null {
  if (!options?.initial) return null;

  const emptyInitialOptions = options && options.initial && !options.initial.steps.length;
  if (emptyInitialOptions) {
    throw new Error(ERRORS["EMPTY_INITIAL_STATE"]);
  }

  const initialOptionsProvided = options && options.initial.steps;
  if (initialOptionsProvided) {
    return fromArray(options.initial, options.pointGeneration);
  }

  return null;
}

export function linkedListToArray(head: ListNode | null): Step[] {
  if (!head) return [];

  const visitedNodes = new Set<ListNode>();
  const result: Step[] = [];

  let current: ListNode | null = head;
  while (current !== null) {
    if (visitedNodes.has(current)) break;

    visitedNodes.add(current);
    result.push(current.val as Step);
    current = current.next;
  }

  return result;
}
