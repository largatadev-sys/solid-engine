export const OPEN_IN_MAPS = 'Open in Google Maps';

export const MAP_UNAVAILABLE = 'The map could not be loaded. You can still open this place in Google Maps.';

export const SEARCH_PLACEHOLDER = 'Search for a place...';

export const SEARCH_UNAVAILABLE = 'Search is unavailable right now. You can still move the map to a place.';

export const SEARCH_NO_RESULTS = 'No places found. Try a different name, or move the map to the spot.';

export const PICKER_TITLE = 'Pick a location';

export const PICKER_CONFIRM = 'Use this location';

export const PICKER_DISMISS = 'Close the map';

export const PICKER_REMOVE = 'Remove pin';

export const PICKER_NEEDS_LABEL = 'Nothing is named here — give this spot a name.';

export const PLACE_LABEL = 'Place name';

export const MOVE_THE_MAP = 'Move the map to place the pin';

export const RESOLVING_PLACE = 'Finding this place...';

export const NOWHERE_NAMED = 'Dropped pin';

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


export function placeDetailLine(name: string, kind: string | null): string {
  const type = kind?.trim() ?? '';
  return type === '' || type === 'yes' ? name.trim() : `${name.trim()} · ${type}`;
}
