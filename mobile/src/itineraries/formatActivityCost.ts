
export function formatActivityCost(amount: string | null, currency: string | null): string | undefined {
  if (amount === null) return undefined;
  if (Number(amount) === 0) return 'Free';
  return currency !== null ? `${currency} ${amount}` : amount;
}


export function activityMetaLine(timeOfDay: string | null, amount: string | null, currency: string | null): string {
  const parts: string[] = [];
  if (timeOfDay !== null) parts.push(timeOfDay);
  const cost = formatActivityCost(amount, currency);
  if (cost !== undefined) parts.push(cost);
  return parts.join(' · ');
}
