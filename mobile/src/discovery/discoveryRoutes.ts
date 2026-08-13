import { paramsFromFilters, type DiscoveryFilters } from './discoveryFilters';

export const DISCOVER_TAB_ROUTE = '/discover';

export const DISCOVERY_SEARCH_ROUTE = '/discovery-search';

export const DISCOVERY_RESULTS_PATHNAME = '/discovery-results';


export function resultsRoute(filters: DiscoveryFilters): {
  pathname: typeof DISCOVERY_RESULTS_PATHNAME;
  params: Record<string, string>;
} {
  return { pathname: DISCOVERY_RESULTS_PATHNAME, params: paramsFromFilters(filters) };
}
