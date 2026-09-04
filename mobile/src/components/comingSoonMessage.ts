export const COMING_SOON_SURFACES = {
  search: 'Search',
  chat: 'Trip chat',
  diary: 'Diary entries',
  comments: 'Comments',
  reviews: 'Reviews',
  rating: 'Ratings',
  booking: 'Booking options',
  tripSearch: 'Searching your trips',
  share: 'Sharing a postcard',
  saved: 'Saved postcards',
  report: 'Reporting a postcard',
  notifications: 'Notifications',
  diaryDetails: 'Editing diary details',
  diaryLink: 'Sharing a diary',
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
