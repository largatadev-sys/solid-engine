const NOON = 12;


export function clockToDate(twentyFourHourTime: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(twentyFourHourTime);
  if (match === null) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  const carrier = new Date();
  carrier.setHours(hours, minutes, 0, 0);
  return carrier;
}


export function dateToClock(picked: Date): string {
  return `${pad(picked.getHours())}:${pad(picked.getMinutes())}`;
}


export function twelveHour(twentyFourHourTime: string): string | null {
  const at = clockToDate(twentyFourHourTime);
  if (at === null) return null;

  const hours = at.getHours();
  const suffix = hours < NOON ? 'AM' : 'PM';
  return `${pad(hours % NOON === 0 ? NOON : hours % NOON)}:${pad(at.getMinutes())} ${suffix}`;
}


function pad(value: number): string {
  return String(value).padStart(2, '0');
}
