import { HOME_TAB_ROUTE, PROFILE_TAB_ROUTE, TRIPS_TAB_ROUTE } from './authRoutes';


export type TabJump = 'dismissTo' | 'navigate';


const PROFILE_STACK = [PROFILE_TAB_ROUTE, '/account', '/diary', '/showcase'];


const HOME_STACK = [HOME_TAB_ROUTE, '/feed'];


const DISCOVER_STACK = ['/discover', '/discovery-results', '/discovery-people'];


const ABOVE_THE_TABS = ['/travelers'];


export function inProfileStack(pathname: string): boolean {
  return PROFILE_STACK.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}


export function inHomeStack(pathname: string): boolean {
  return pathname === HOME_TAB_ROUTE || pathname.startsWith('/feed');
}


export function inDiscoverStack(pathname: string): boolean {
  return DISCOVER_STACK.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}


export function aboveTheTabs(pathname: string): boolean {
  return ABOVE_THE_TABS.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}


export function inTripsStack(pathname: string): boolean {
  return (
    !inHomeStack(pathname) &&
    !inProfileStack(pathname) &&
    !inDiscoverStack(pathname) &&
    !aboveTheTabs(pathname)
  );
}


export function tabJump(canDismiss: boolean, inThisStack: boolean): TabJump {
  return canDismiss && inThisStack ? 'dismissTo' : 'navigate';
}
