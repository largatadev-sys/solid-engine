import { inDiscoverStack, inHomeStack, inProfileStack } from './tabJump';
import {
  DISCOVER_TAB_ROUTE,
  HOME_TAB_ROUTE,
  PROFILE_TAB_ROUTE,
  TRIPS_TAB_ROUTE,
  type TabRoute,
} from './retapRoutes';

export const RETAP_WINDOW_MS = 400;

export type RetapClock = () => number;

export type TabRetapListener = () => void;

const listeners = new Map<TabRoute, TabRetapListener>();


export function isRetap(previousAt: number | null, now: number): boolean {
  if (previousAt === null) return false;
  const since = now - previousAt;
  return since >= 0 && since <= RETAP_WINDOW_MS;
}


export function retapRouteFor(pathname: string): TabRoute {
  if (inHomeStack(pathname)) return HOME_TAB_ROUTE;
  if (inDiscoverStack(pathname)) return DISCOVER_TAB_ROUTE;
  if (inProfileStack(pathname)) return PROFILE_TAB_ROUTE;
  return TRIPS_TAB_ROUTE;
}


export function onTabRetap(route: TabRoute, listen: TabRetapListener): () => void {
  listeners.set(route, listen);
  return () => {
    if (listeners.get(route) === listen) {
      listeners.delete(route);
    }
  };
}


export function tabRetapped(route: TabRoute): void {
  listeners.get(route)?.();
}
