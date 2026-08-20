import type { ItineraryResponse, ItineraryState } from '../types/api';


export type TripTab = ItineraryState;


export const TRIP_TABS: readonly TripTab[] = ['upcoming', 'ongoing', 'completed'] as const;


const LABELS: Record<TripTab, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Ongoing',
  completed: 'Completed',
};


const EMPTY_COPY: Record<TripTab, string> = {
  upcoming: 'No trips on the horizon yet.',
  ongoing: 'No trip underway right now.',
  completed: "Trips you've travelled will collect here.",
};


export function tabLabel(tab: TripTab): string {
  return LABELS[tab];
}


export function tabEmptyCopy(tab: TripTab): string {
  return EMPTY_COPY[tab];
}


export function tabOf(itinerary: Pick<ItineraryResponse, 'state'>): TripTab {
  return itinerary.state;
}


export function tripsInTab(itineraries: ItineraryResponse[], tab: TripTab): ItineraryResponse[] {
  return itineraries.filter((itinerary) => !itinerary.archived && tabOf(itinerary) === tab);
}


export function landingTab(itineraries: ItineraryResponse[], picked: TripTab | null): TripTab {
  if (picked !== null) return picked;
  return tripsInTab(itineraries, 'ongoing').length > 0 ? 'ongoing' : 'upcoming';
}


export function showsCreateBar(tab: TripTab): boolean {
  return tab === 'upcoming';
}


export function showsArchivedLink(tab: TripTab): boolean {
  return tab === 'completed';
}


export function tripCardSubline(
  itinerary: Pick<ItineraryResponse, 'destination' | 'dayCount'>,
): string {
  const days = itinerary.dayCount ?? 0;
  if (days === 0) return itinerary.destination;
  return `${itinerary.destination} · ${days} ${days === 1 ? 'day' : 'days'}`;
}


export function editingAdvisory(itinerary: Pick<ItineraryResponse, 'beingEdited'>): string | null {
  return itinerary.beingEdited === true ? 'Currently being edited' : null;
}


export const TAB_ROW_LABEL = 'Trip lifecycle';
