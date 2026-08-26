export const DISCOVER_TAB_LABEL = 'Discover';

export const SEARCH_PLACEHOLDER = 'Destinations, itineraries, people…';

export const TRENDING_SECTION_TITLE = 'Trending destinations';

export const RECOMMENDED_SECTION_TITLE = 'Recommended itineraries';

export const SEE_ALL_LABEL = 'See all';

export const SEE_ALL_CARD_LABEL = 'See all itineraries';

export const SECTION_FAILED = 'Couldn’t load this section.';

export const SECTION_RETRY_LABEL = 'Retry this section';

export const LANDING_EMPTY_TITLE = 'Nothing published yet';

export const LANDING_EMPTY_BODY =
  'When travelers publish their trips, they show up here. Yours can be the first.';

export const RESULTS_RETRY_LABEL = 'Retry loading more';

export const RESULTS_LOAD_FAILED = 'Couldn’t load more.';

export const BROWSE_ALL_TITLE = 'All itineraries';


export function resultCountLine(count: number): string {
  return count === 1 ? '1 itinerary' : `${count} itineraries`;
}


export function tripCountLine(count: number): string {
  return count === 1 ? '1 trip' : `${count} trips`;
}


export const TRIPS_GROUP_LABEL = 'Trips';

export const SEARCH_BACK_LABEL = 'Back to search';

export const NO_TRIPS_SUPPORT = 'Try a destination or itinerary name.';


export function noTripsMatchTitle(query: string): string {
  return `No trips match "${query}"`;
}


export const SEARCH_CANCEL_LABEL = 'Cancel';

export const RECENT_SECTION_LABEL = 'Recent';

export const RECENT_CLEAR_LABEL = 'Clear';

export const SUGGESTED_SECTION_LABEL = 'Trending searches';

export const SUGGESTED_DESTINATIONS_LABEL = 'Destinations';

export const SUGGESTED_ITINERARIES_LABEL = 'Itineraries';

export const FILTERS_TITLE = 'Filters';

export const FILTERS_RESET_LABEL = 'Reset';

export const FILTER_DESTINATION_LABEL = 'Destination';

export const FILTER_DURATION_LABEL = 'Duration';

export const FILTER_DESTINATION_PLACEHOLDER = 'Anywhere';

export const APPLY_FALLBACK_LABEL = 'Show results';

export const APPLY_NO_MATCHES_LABEL = 'No exact matches';

export const CLEAR_FILTERS_LABEL = 'Clear filters';

export const SEARCH_RETRY_BANNER = 'Couldn’t reach Largata.';

export const SEARCH_RETRY_ACTION = 'Retry';


export function applyButtonLabel(count: number | null): string {
  if (count === null) {
    return APPLY_FALLBACK_LABEL;
  }
  if (count === 0) {
    return APPLY_NO_MATCHES_LABEL;
  }
  return `Show ${resultCountLine(count)}`;
}


export function noResultsLine(query: string | null): string {
  return query === null
    ? 'Nothing matches these filters'
    : `Nothing for “${query}” with these filters`;
}
