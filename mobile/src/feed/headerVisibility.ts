export const HIDE_AFTER = 24;

const HIDE_DELTA = 8;

const SHOW_DELTA = 4;


export interface HeaderState {
  readonly hidden: boolean;
  readonly lastY: number;
}


export const HEADER_SHOWING: HeaderState = { hidden: false, lastY: 0 };


export function onScroll(state: HeaderState, y: number): HeaderState {
  const moved = y - state.lastY;

  if (!state.hidden && moved > HIDE_DELTA && y > HIDE_AFTER) {
    return { hidden: true, lastY: y };
  }
  if (state.hidden && moved < -SHOW_DELTA) {
    return { hidden: false, lastY: y };
  }
  if (state.hidden && y <= HIDE_AFTER) {
    return { hidden: false, lastY: y };
  }
  return { hidden: state.hidden, lastY: y };
}


export function atTop(y: number): boolean {
  return y <= HIDE_AFTER;
}
