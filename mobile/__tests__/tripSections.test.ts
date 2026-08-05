import {
  draftSubtitle,
  editingAdvisory,
  groupIntoSections,
  sectionLabel,
  sectionOf,
  TRIP_SECTIONS,
} from '../src/itineraries/tripSections';
import type { ItineraryResponse } from '../src/types/api';

function trip(over: Partial<ItineraryResponse> = {}): ItineraryResponse {
  return {
    id: over.id ?? 'id',
    title: over.title ?? 'A trip',
    destinations: ['Palawan'],
    state: 'draft',
    published: false,
    visibility: 'public',
    archived: false,
    ...over,
  } as ItineraryResponse;
}

describe('the Trips sections (ADR-020)', () => {
  it('renders the lifecycle in the order a traveler cares about, not enum order', () => {
    expect(TRIP_SECTIONS).toEqual(['ongoing', 'upcoming', 'draft', 'completed']);
    expect(TRIP_SECTIONS.map(sectionLabel)).toEqual(['Ongoing', 'Upcoming', 'Draft', 'Completed']);
  });

  it('puts every trip in exactly one section, because sections are the lifecycle', () => {
    expect(sectionOf(trip({ state: 'draft' }))).toBe('draft');
    expect(sectionOf(trip({ state: 'upcoming' }))).toBe('upcoming');
    expect(sectionOf(trip({ state: 'ongoing' }))).toBe('ongoing');
    expect(sectionOf(trip({ state: 'completed' }))).toBe('completed');
  });

  it('hides an empty section rather than rendering a vacant heading', () => {
    const sections = groupIntoSections([trip({ id: 'a', state: 'draft' })]);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ section: 'draft', label: 'Draft' });
    expect(sections[0]?.data.map((t) => t.id)).toEqual(['a']);
  });

  it('keeps the section order even when only some are populated', () => {
    const sections = groupIntoSections([
      trip({ id: 'd', state: 'draft' }),
      trip({ id: 'c', state: 'completed' }),
      trip({ id: 'o', state: 'ongoing' }),
    ]);

    expect(sections.map((s) => s.section)).toEqual(['ongoing', 'draft', 'completed']);
  });

  it('preserves the order the server sent within a section', () => {
    const sections = groupIntoSections([
      trip({ id: 'first', state: 'completed' }),
      trip({ id: 'second', state: 'completed' }),
    ]);

    expect(sections[0]?.data.map((t) => t.id)).toEqual(['first', 'second']);
  });

  it('returns nothing at all when the traveler has no trips', () => {
    expect(groupIntoSections([])).toEqual([]);
  });

  it('sections a published trip by its lifecycle, because discovery is a different axis', () => {
    expect(sectionOf(trip({ state: 'completed', published: true, visibility: 'private' }))).toBe(
      'completed',
    );
  });
});

describe("the card's status slot (S4.13 decision 4)", () => {
  it('shows the advisory on any card whose trip is being edited right now', () => {
    expect(editingAdvisory(trip({ beingEdited: true }))).toBe('Currently being edited');
    expect(editingAdvisory(trip({ state: 'completed', beingEdited: true }))).toBe(
      'Currently being edited',
    );
  });

  it('shows nothing when nobody is in there, including when the server omits the field', () => {
    expect(editingAdvisory(trip({ beingEdited: false }))).toBeNull();
    expect(editingAdvisory(trip({}))).toBeNull();
  });

  it('keeps the mock subtitle on drafts and nowhere else', () => {
    expect(draftSubtitle(trip({ state: 'draft' }))).toBe('Continue editing your Trip Workspace');
    expect(draftSubtitle(trip({ state: 'upcoming' }))).toBeNull();
    expect(draftSubtitle(trip({ state: 'ongoing' }))).toBeNull();
    expect(draftSubtitle(trip({ state: 'completed' }))).toBeNull();
  });

  it('carries no publication badge — that placement is deferred, not deleted', () => {
    const published = trip({ state: 'completed', published: true, visibility: 'public' });

    expect(editingAdvisory(published)).toBeNull();
    expect(draftSubtitle(published)).toBeNull();
  });
});
