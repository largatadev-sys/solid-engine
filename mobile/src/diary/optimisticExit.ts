export type ExitState<T> = {
  readonly rows: readonly T[];
  readonly exiting: readonly string[];
  readonly count: number;
};


export function readyToExit<T>(rows: readonly T[], count: number): ExitState<T> {
  return { rows, exiting: [], count };
}


export function exited<T>(state: ExitState<T>, id: string, decrements: boolean): ExitState<T> {
  if (state.exiting.includes(id)) return state;

  return {
    rows: state.rows,
    exiting: [...state.exiting, id],
    count: decrements ? Math.max(0, state.count - 1) : state.count,
  };
}


export function reverted<T>(state: ExitState<T>, id: string, decremented: boolean): ExitState<T> {
  if (!state.exiting.includes(id)) return state;

  return {
    rows: state.rows,
    exiting: state.exiting.filter((exiting) => exiting !== id),
    count: decremented ? state.count + 1 : state.count,
  };
}


export function settled<T>(
  state: ExitState<T>,
  id: string,
  identify: (row: T) => string,
): ExitState<T> {
  return {
    rows: state.rows.filter((row) => identify(row) !== id),
    exiting: state.exiting.filter((exiting) => exiting !== id),
    count: state.count,
  };
}


export function visible<T>(state: ExitState<T>, identify: (row: T) => string): T[] {
  return state.rows.filter((row) => !state.exiting.includes(identify(row)));
}


export function isEmptied<T>(state: ExitState<T>, identify: (row: T) => string): boolean {
  return visible(state, identify).length === 0;
}
