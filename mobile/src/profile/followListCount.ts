export function shownFollowCount(
  servedCount: number | undefined,
  served: readonly { readonly id: string }[],
  leaving: readonly string[],
): number {
  const onTheirWayOut = served.filter((person) => leaving.includes(person.id)).length;
  return Math.max(0, (servedCount ?? served.length) - onTheirWayOut);
}
