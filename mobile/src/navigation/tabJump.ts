export type TabJump = 'dismissTo' | 'navigate';


const PROFILE_STACK = ['/profile', '/account', '/diary', '/showcase'];


export function inProfileStack(pathname: string): boolean {
  return PROFILE_STACK.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}


export function tabJump(canDismiss: boolean, inThisStack: boolean): TabJump {
  return canDismiss && inThisStack ? 'dismissTo' : 'navigate';
}
