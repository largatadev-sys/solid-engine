import { DISCOVER_TAB_ROUTE } from '../discovery/discoveryRoutes';
import { HOME_TAB_ROUTE, PROFILE_TAB_ROUTE, TRIPS_TAB_ROUTE } from './authRoutes';

export { DISCOVER_TAB_ROUTE, HOME_TAB_ROUTE, PROFILE_TAB_ROUTE, TRIPS_TAB_ROUTE };

export type TabRoute =
  | typeof HOME_TAB_ROUTE
  | typeof DISCOVER_TAB_ROUTE
  | typeof TRIPS_TAB_ROUTE
  | typeof PROFILE_TAB_ROUTE;

export const TAB_ROUTES: readonly TabRoute[] = [
  HOME_TAB_ROUTE,
  DISCOVER_TAB_ROUTE,
  TRIPS_TAB_ROUTE,
  PROFILE_TAB_ROUTE,
];
