import type { EstimatedCostResponse } from '../types/api';
import { formatActivityCost } from './formatActivityCost';


export function destinationPillLabel(destinations: string[]): string | undefined {
  if (destinations.length === 0) return undefined;
  return destinations.map((destination) => destination.toUpperCase()).join(' · ');
}


export function durationLabel(durationDays: number): string | undefined {
  if (durationDays <= 0) return undefined;
  return `${durationDays} ${durationDays === 1 ? 'Day' : 'Days'}`;
}


export function estimatedTotalLabel(cost: EstimatedCostResponse | null): string | undefined {
  if (cost === null) return undefined;
  return formatActivityCost(cost.amount, cost.currency);
}


export function bylineHandle(handle: string | null): string | undefined {
  return handle === null || handle === '' ? undefined : `@${handle}`;
}
