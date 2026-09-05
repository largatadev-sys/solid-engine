export const OPEN_IN_MAPS = 'Open in Google Maps';

export const MAP_UNAVAILABLE = 'The map could not be loaded. You can still open this place in Google Maps.';

export const SEARCH_PLACEHOLDER = 'Search for a place...';

export const SEARCH_UNAVAILABLE = 'Search is unavailable right now. You can still move the map to a place.';

export const SEARCH_NO_RESULTS = 'No places found. Try a different name, or move the map to the spot.';

export const PICKER_CONFIRM = 'Use this location';

export const PICKER_DISMISS = 'Close the map';

export const PICKER_REMOVE = 'Remove pin';

export const PLACE_LABEL = 'Name this place';

export const RESOLVING_PLACE = 'Finding this place...';

export const LOOKUP_UNAVAILABLE = 'We could not look this spot up. Name it yourself.';

export const PIN_AT_CENTRE = 'The pin sits at the centre of the map';


export function viewerLabel(place: string): string {
  return `${place.trim()} on a map`;
}


export function pinnedLinkLabel(place: string): string {
  return `${place.trim()}, show on a map`;
}


export function resultLabel(name: string, context: string | null): string {
  const where = context?.trim() ?? '';
  return where === '' ? name.trim() : `${name.trim()}, ${where}`;
}



export function placeFieldLabel(place: string): string {
  const named = place.trim();
  return named === ''
    ? 'Set a location, opens a map'
    : `Location: ${named}, tap to change`;
}


export const PICK_ON_MAP = 'Pick on map';

export const PICKED_ON_MAP = 'Pinned — tap to change';

