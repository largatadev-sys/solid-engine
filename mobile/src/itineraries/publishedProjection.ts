import type { EstimatedCostResponse } from '../types/api';
import { formatActivityCost } from './formatActivityCost';


export function destinationPillLabel(destination: string | null | undefined): string | undefined {
  const named = (destination ?? '').trim();
  if (named === '') return undefined;
  return named.toUpperCase();
}


export function durationLabel(durationDays: number): string | undefined {
  if (durationDays <= 0) return undefined;
  return `${durationDays} ${durationDays === 1 ? 'Day' : 'Days'}`;
}


export function estimatedTotalLabel(cost: EstimatedCostResponse | null): string | undefined {
  if (cost === null) return undefined;
  const sum = formatActivityCost(cost.amount, cost.currency);
  return cost.partial === true ? `From ${sum}` : sum;
}


export function bylineHandle(handle: string | null): string | undefined {
  return handle === null || handle === '' ? undefined : `@${handle}`;
}
