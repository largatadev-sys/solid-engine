export function shownFollowCount(
  servedCount: number | undefined,
  servedIds: readonly string[],
  leaving: readonly string[],
): number {
  const onTheirWayOut = servedIds.filter((id) => leaving.includes(id)).length;
  return Math.max(0, (servedCount ?? servedIds.length) - onTheirWayOut);
}
