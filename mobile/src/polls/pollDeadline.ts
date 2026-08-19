export interface DeadlineParts {
  readonly date: string;
  readonly time: string;
}


export function partsOfInstant(instant: string): DeadlineParts {
  const at = new Date(instant);
  return {
    date: `${pad(at.getFullYear(), 4)}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
    time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
  };
}


export function instantOfParts(parts: DeadlineParts): string | null {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parts.date);
  const time = /^(\d{1,2}):(\d{2})$/.exec(parts.time);
  if (date === null || time === null) return null;

  const at = new Date(
    Number(date[1]),
    Number(date[2]) - 1,
    Number(date[3]),
    Number(time[1]),
    Number(time[2]),
    0,
    0,
  );
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}


export function isInTheFuture(instant: string | null, now: number): boolean {
  return instant !== null && Date.parse(instant) > now;
}


function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}
