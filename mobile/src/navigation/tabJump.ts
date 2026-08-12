import { HOME_TAB_ROUTE, PROFILE_TAB_ROUTE, TRIPS_TAB_ROUTE } from './authRoutes';


export type TabJump = 'dismissTo' | 'navigate';


const PROFILE_STACK = [PROFILE_TAB_ROUTE, '/account', '/diary', '/showcase'];


const HOME_STACK = [HOME_TAB_ROUTE, '/feed'];


export function inProfileStack(pathname: string): boolean {
  return PROFILE_STACK.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}


export function inHomeStack(pathname: string): boolean {
  return pathname === HOME_TAB_ROUTE || pathname.startsWith('/feed');
}


export function inTripsStack(pathname: string): boolean {
  return !inHomeStack(pathname) && !inProfileStack(pathname);
}


export function tabJump(canDismiss: boolean, inThisStack: boolean): TabJump {
  return canDismiss && inThisStack ? 'dismissTo' : 'navigate';
}
