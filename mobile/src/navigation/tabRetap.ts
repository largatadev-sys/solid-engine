import type { TabRoute } from './retapRoutes';

export type TabRetapListener = () => void;

const listeners = new Map<TabRoute, TabRetapListener>();


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
