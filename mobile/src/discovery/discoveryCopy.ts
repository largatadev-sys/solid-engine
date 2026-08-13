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
