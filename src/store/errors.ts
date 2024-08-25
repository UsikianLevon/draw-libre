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
