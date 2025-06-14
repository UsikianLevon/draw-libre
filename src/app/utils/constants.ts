export const EVENTS = {
  RIGHTCLICKREMOVE: "mdl:rightclickremove",
  POINTENTER: "mdl:pointenter",
  POINT_LEAVE: "mdl:pointleave",
  MOVE_END: "mdl:moveend",
  ADD: "mdl:add",
  UNDO: "mdl:undo",
  REDO: "mdl:redo",
  REMOVE_ALL: "mdl:removeall",
  SAVE: "mdl:save",
  BREAK: "mdl:break",
  MODE_CHANGED: "mdl:modechanged",
  UNDO_STACK_CHANGED: "mdl:undostackchanged",
  REDO_STACK_CHANGED: "mdl:redostackchanged",
} as const;

export const MOBILE_WIDTH = 768; // TODO put this inside options for the user to change
