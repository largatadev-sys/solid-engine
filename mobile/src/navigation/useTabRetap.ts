import { useEffect } from 'react';
import { onTabRetap, type TabRetapListener } from './tabRetap';
import type { TabRoute } from './retapRoutes';


export function useTabRetap(route: TabRoute, listen: TabRetapListener): void {
  useEffect(() => onTabRetap(route, listen), [route, listen]);
}
