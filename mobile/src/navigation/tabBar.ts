import { DISCOVER_TAB_ROUTE } from '../discovery/discoveryRoutes';
import { HOME_TAB_ROUTE, PROFILE_TAB_ROUTE, TRIPS_TAB_ROUTE } from './authRoutes';

export const MAIN_SCREENS: readonly string[] = [
  HOME_TAB_ROUTE,
  DISCOVER_TAB_ROUTE,
  TRIPS_TAB_ROUTE,
  PROFILE_TAB_ROUTE,
];

export function showsTabBar(pathname: string): boolean {
  const at = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  return MAIN_SCREENS.includes(at);
}
