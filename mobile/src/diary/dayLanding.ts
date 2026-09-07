export type DayTops = Readonly<Record<string, number>>;

export function landingOffsetOf(
  dayId: string | null,
  dayTops: DayTops,
  daysTop: number | null,
): number | null {
  if (dayId === null || daysTop === null) return null;

  const within = dayTops[dayId];

  return within === undefined ? null : daysTop + within;
}
