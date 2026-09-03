import { midpoint, pinchBaseline, spanOf, type SurfacePoint } from './mapGesture';


export interface TrackedPointer {
  readonly id: number;
  readonly at: SurfacePoint;
}


export interface GestureState {
  readonly pointers: readonly TrackedPointer[];
  readonly baseline: { readonly span: number; readonly zoom: number } | null;
  readonly everPinched: boolean;
  readonly anchor: SurfacePoint | null;
  readonly tracking: boolean;
}


export const NO_GESTURE: GestureState = {
  pointers: [],
  baseline: null,
  everPinched: false,
  anchor: null,
  tracking: false,
};


export interface Moved {
  readonly state: GestureState;
  readonly pan: { readonly dx: number; readonly dy: number } | null;
  readonly pinch: {
    readonly span: number;
    readonly fromSpan: number;
    readonly fromZoom: number;
    readonly at: SurfacePoint;
  } | null;
}


export interface Lifted {
  readonly state: GestureState;
  readonly travel: { readonly dx: number; readonly dy: number } | null;
  readonly pinched: boolean;
  readonly done: boolean;
}


export function pointerDown(
  state: GestureState,
  id: number,
  at: SurfacePoint,
  zoom: number,
  primary: boolean,
): GestureState {
  const fresh = primary || !state.tracking ? NO_GESTURE : state;
  if (fresh.pointers.length >= 2) return fresh;

  const pointers = [...fresh.pointers.filter((held) => held.id !== id), { id, at }];
  if (pointers.length < 2) {
    return { ...fresh, pointers, anchor: at, tracking: true };
  }

  return {
    ...fresh,
    pointers,
    everPinched: true,
    tracking: true,
    baseline: baselineFor(pointers, zoom),
  };
}


export function pointerMove(state: GestureState, id: number, at: SurfacePoint, zoom: number): Moved {
  if (!state.pointers.some((held) => held.id === id)) {
    return { state, pan: null, pinch: null };
  }

  const pointers = state.pointers.map((held) => (held.id === id ? { id, at } : held));
  const moved = { ...state, pointers };

  if (pointers.length >= 2) {
    const baseline = moved.baseline ?? baselineFor(pointers, zoom);
    const withBaseline = { ...moved, baseline };
    if (baseline === null) return { state: withBaseline, pan: null, pinch: null };

    const [first, second] = pointers;
    return {
      state: withBaseline,
      pan: null,
      pinch: {
        span: spanOf(first!.at, second!.at),
        fromSpan: baseline.span,
        fromZoom: baseline.zoom,
        at: midpoint(first!.at, second!.at),
      },
    };
  }

  const anchor = moved.anchor;
  if (anchor === null) return { state: moved, pan: null, pinch: null };

  return { state: moved, pan: { dx: at.x - anchor.x, dy: at.y - anchor.y }, pinch: null };
}


export function pointerUp(state: GestureState, id: number, at: SurfacePoint): Lifted {
  const pointers = state.pointers.filter((held) => held.id !== id);

  if (pointers.length >= 1) {
    const remaining = pointers[0]!;
    return {
      state: { ...state, pointers, baseline: null, anchor: remaining.at },
      travel: null,
      pinched: state.everPinched,
      done: false,
    };
  }

  const anchor = state.anchor;

  return {
    state: NO_GESTURE,
    travel: anchor === null ? null : { dx: at.x - anchor.x, dy: at.y - anchor.y },
    pinched: state.everPinched,
    done: true,
  };
}


function baselineFor(
  pointers: readonly TrackedPointer[],
  zoom: number,
): { readonly span: number; readonly zoom: number } | null {
  const [first, second] = pointers;
  if (first === undefined || second === undefined) return null;

  return pinchBaseline(spanOf(first.at, second.at), zoom);
}
