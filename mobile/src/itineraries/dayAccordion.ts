export function defaultOpenDay(dayIds: readonly string[], requestedDayId?: string): string | null {
  if (dayIds.length === 0) return null;
  if (requestedDayId !== undefined && dayIds.includes(requestedDayId)) return requestedDayId;
  return dayIds[0] ?? null;
}


export function toggleOpenDay(openDayId: string | null, tappedDayId: string): string | null {
  return openDayId === tappedDayId ? null : tappedDayId;
}
