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
  initialSteps: Step[],
  closeGeometry: Initial["closeGeometry"],
  pointGeneration: RequiredDrawOptions["pointGeneration"],
): Store {
  const store = new Store();
  const steps = closeGeometry ? initialSteps.slice(0, -1) : initialSteps;

  steps.forEach((step, idx) => {
    store.push(step);

    // if we are at the end of the array and there's no next point
    // we need to create an auxiliary point with the first point
    // to close the geometry
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

function generateIdForSteps(stepsWithoutIds: LatLng[]): Step[] {
  return stepsWithoutIds.map((step, idx) => {
    return { ...step, isAuxiliary: false, isFirst: idx === 0, id: uuidv4() };
  });
}

function fromArray(initialOptions: Initial, pointGeneration: RequiredDrawOptions["pointGeneration"]): Store | null {
  const { steps: initialSteps, closeGeometry, generateId } = initialOptions;
  const steps = generateId ? generateIdForSteps(initialSteps) : initialSteps;
  const list = buildStepSequence(steps as Step[], closeGeometry, pointGeneration);

  if (closeGeometry && list.tail && list.head) {
    list.tail.next = list.head;
    list.head.prev = list.tail;
  }
  return list;
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
