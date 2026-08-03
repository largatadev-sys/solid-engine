export const COMING_SOON_SURFACES = {
  home: 'Home feed',
  search: 'Search',
  chat: 'Trip chat',
  coverPhoto: 'Cover photo',
  activityPhoto: 'Activity photo',
  network: 'From your network',
  activityHistory: 'Activity history',
  fork: 'Forking an itinerary',
  diary: 'Diary entries',
  comments: 'Comments',
  reviews: 'Reviews',
  rating: 'Ratings',
  follow: 'Following a creator',
  booking: 'Booking options',
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
