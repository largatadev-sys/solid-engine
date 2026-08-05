import type { ItineraryResponse, ItineraryState } from '../types/api';


export type TripSection = ItineraryState;


export const TRIP_SECTIONS: readonly TripSection[] = [
  'ongoing',
  'upcoming',
  'draft',
  'completed',
] as const;


const LABELS: Record<TripSection, string> = {
  ongoing: 'Ongoing',
  upcoming: 'Upcoming',
  draft: 'Draft',
  completed: 'Completed',
};


export function sectionLabel(section: TripSection): string {
  return LABELS[section];
}


export function sectionOf(itinerary: Pick<ItineraryResponse, 'state'>): TripSection {
  return itinerary.state;
}


export type TripSectionGroup = {
  section: TripSection;
  label: string;
  data: ItineraryResponse[];
};


export function editingAdvisory(
  itinerary: Pick<ItineraryResponse, 'beingEdited'>,
): string | null {
  return itinerary.beingEdited === true ? 'Currently being edited' : null;
}


export function draftSubtitle(itinerary: Pick<ItineraryResponse, 'state'>): string | null {
  return itinerary.state === 'draft' ? 'Continue editing your Trip Workspace' : null;
}


export function groupIntoSections(itineraries: ItineraryResponse[]): TripSectionGroup[] {
  return TRIP_SECTIONS.map((section) => ({
    section,
    label: sectionLabel(section),
    data: itineraries.filter((itinerary) => sectionOf(itinerary) === section),
  })).filter((group) => group.data.length > 0);
}
