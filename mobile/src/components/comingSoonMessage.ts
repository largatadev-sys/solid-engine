export const COMING_SOON_SURFACES = {
  search: 'Search',
  chat: 'Trip chat',
  network: 'From your network',
  diary: 'Diary entries',
  comments: 'Comments',
  reviews: 'Reviews',
  rating: 'Ratings',
  follow: 'Following a creator',
  booking: 'Booking options',
  tripSearch: 'Searching your trips',
  tripFilter: 'Filtering your trips',
  profile: 'Traveler profiles',
  share: 'Sharing a postcard',
  saved: 'Saved postcards',
  report: 'Reporting a postcard',
  notifications: 'Notifications',
} as const;

export type ComingSoonSurface = keyof typeof COMING_SOON_SURFACES;


export function comingSoonMessage(surface: ComingSoonSurface): { title: string; body: string } {
  return {
    title: `${COMING_SOON_SURFACES[surface]} — coming soon`,
    body: 'This part of the app is still being built. It will arrive in a later update.',
  };
}


export const COMING_SOON_TAPPED = 'coming_soon_tapped';

export const COMING_SOON_SEEN = 'coming_soon_seen';
