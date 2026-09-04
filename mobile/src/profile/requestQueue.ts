export interface DecidedRequest {
  readonly travelerId: string;
  readonly verdict: 'approve' | 'decline';
}


export interface RequestQueue {
  readonly decided: readonly DecidedRequest[];
}


export function emptyRequestQueue(): RequestQueue {
  return { decided: [] };
}


export function decided(
  queue: RequestQueue,
  travelerId: string,
  verdict: 'approve' | 'decline',
): RequestQueue {
  if (queue.decided.some((row) => row.travelerId === travelerId)) {
    return queue;
  }
  return { decided: [...queue.decided, { travelerId, verdict }] };
}


export function restored(queue: RequestQueue, travelerId: string): RequestQueue {
  return { decided: queue.decided.filter((row) => row.travelerId !== travelerId) };
}


export function shownRows<T extends { readonly traveler: { readonly id: string } }>(
  rows: readonly T[],
  queue: RequestQueue,
): T[] {
  const gone = new Set(queue.decided.map((row) => row.travelerId));
  return rows.filter((row) => !gone.has(row.traveler.id));
}
