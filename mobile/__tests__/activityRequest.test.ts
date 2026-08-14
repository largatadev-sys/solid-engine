import { buildActivityRequest } from '../src/itineraries/buildActivityRequest';
import type { ActivityResponse } from '../src/types/api';


function existing(over: Partial<ActivityResponse> = {}): ActivityResponse {
  return {
    id: 'a1',
    sortOrder: 0,
    title: 'Big Lagoon Kayaking',
    timeOfDay: '09:00',
    costAmount: '1200.00',
    costCurrency: 'PHP',
    place: 'Big Lagoon, Miniloc Island',
    description: 'A long description written before the redesign',
    notes: 'Creator tips that the form no longer shows',
    externalUrl: 'https://klook.com/mamamo/1234',
    bookingPurpose: 'Tour',
    bookingProvider: 'Klook',
    bookingPriceAmount: '1500.00',
    bookingPriceCurrency: 'PHP',
    lastEditedBy: 't1',
    lastEditedAt: '2026-08-08T00:00:00Z',
    photos: [],
    ...over,
  };
}


const FORM = {
  title: 'Renamed activity',
  timeOfDay: '10:30',
  place: 'Small Lagoon',
  costAmount: '900',
  costCurrency: 'PHP',
  externalUrl: 'https://klook.com/mamamo/9999',
};


describe('buildActivityRequest on create', () => {
  it('sends exactly the five mocked fields', () => {
    expect(buildActivityRequest(FORM, undefined)).toEqual({
      title: 'Renamed activity',
      timeOfDay: '10:30',
      place: 'Small Lagoon',
      costAmount: '900',
      costCurrency: 'PHP',
      externalUrl: 'https://klook.com/mamamo/9999',
    });
  });

  it('omits every empty optional field rather than sending blanks', () => {
    expect(buildActivityRequest({ title: 'Just a name' }, undefined)).toEqual({ title: 'Just a name' });
  });

  it('never invents the culled fields on a new activity', () => {
    const request = buildActivityRequest(FORM, undefined);
    expect(request.description).toBeUndefined();
    expect(request.notes).toBeUndefined();
    expect(request.bookingPurpose).toBeUndefined();
    expect(request.bookingProvider).toBeUndefined();
  });
});


describe('buildActivityRequest on edit — the culled fields survive', () => {
  it('echoes back description and notes so the PATCH does not wipe them', () => {
    const request = buildActivityRequest(FORM, existing());
    expect(request.description).toBe('A long description written before the redesign');
    expect(request.notes).toBe('Creator tips that the form no longer shows');
  });

  it('echoes back the whole booking card the form no longer edits', () => {
    const request = buildActivityRequest(FORM, existing());
    expect(request.bookingPurpose).toBe('Tour');
    expect(request.bookingProvider).toBe('Klook');
    expect(request.bookingPriceAmount).toBe('1500.00');
    expect(request.bookingPriceCurrency).toBe('PHP');
  });

  it('still takes the five shown fields from the form, not from the existing activity', () => {
    const request = buildActivityRequest(FORM, existing());
    expect(request.title).toBe('Renamed activity');
    expect(request.timeOfDay).toBe('10:30');
    expect(request.place).toBe('Small Lagoon');
    expect(request.costAmount).toBe('900');
    expect(request.externalUrl).toBe('https://klook.com/mamamo/9999');
  });

  it('lets the traveler clear a shown field — an emptied booking link is omitted, not echoed back', () => {
    const request = buildActivityRequest({ ...FORM, externalUrl: '' }, existing());
    expect(request.externalUrl).toBeUndefined();
  });

  it('omits culled fields the existing activity never had', () => {
    const request = buildActivityRequest(FORM, existing({ description: null, notes: null }));
    expect(request.description).toBeUndefined();
    expect(request.notes).toBeUndefined();
  });

  it('drops the cost pair together when the price is cleared, since the wire pairs them', () => {
    const request = buildActivityRequest({ ...FORM, costAmount: '' }, existing());
    expect(request.costAmount).toBeUndefined();
    expect(request.costCurrency).toBeUndefined();
  });

  it('clears both fields rather than orphaning the currency the traveler never typed', () => {
    const request = buildActivityRequest({ ...FORM, costAmount: '   ' }, existing());
    expect(request.costAmount).toBeUndefined();
    expect(request.costCurrency).toBeUndefined();
  });
});


describe('the prefilled currency is a hint, not data (S4.24)', () => {
  it('carries neither cost field when the amount is left empty', () => {
    const request = buildActivityRequest({ ...FORM, costAmount: '', costCurrency: 'PHP' }, undefined);

    expect(request.costAmount).toBeUndefined();
    expect(request.costCurrency).toBeUndefined();
    expect(request.title).toBe('Renamed activity');
  });

  it('carries both once an amount is typed against the prefill', () => {
    const request = buildActivityRequest({ ...FORM, costAmount: '500', costCurrency: 'PHP' }, undefined);

    expect(request.costAmount).toBe('500');
    expect(request.costCurrency).toBe('PHP');
  });

  it('keeps an explicit zero, because Free is a stated price and absent is not', () => {
    const request = buildActivityRequest({ ...FORM, costAmount: '0', costCurrency: 'PHP' }, undefined);

    expect(request.costAmount).toBe('0');
    expect(request.costCurrency).toBe('PHP');
  });
});
