import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createRequestFrom,
  currencyChangeNeedsConfirming,
  pricedActivityCount,
  DURATION_CHOICES,
  EMPTY_TRIP_FORM,
  tripFormChrome,
  tripFormFields,
  tripFormValuesFrom,
  updateRequestFrom,
  validateTripForm,
  type TripFormMode,
  type TripFormValues,
} from '../src/itineraries/tripFormContract';


const MODES: TripFormMode[] = ['create', 'edit'];


const blank: TripFormValues = {
  title: '',
  destination: '',
  currency: 'PHP',
  description: '',
  standouts: [''],
  bestTimeOfYear: '',
  duration: '',
  startDate: '',
  endDate: '',
};


const filled: TripFormValues = { ...blank, title: 'Hokkaido in winter', destination: 'Sapporo' };


describe('what both modes share — the fields that stopped drifting (S4.19 decision 3)', () => {
  const form = readFileSync(join(__dirname, '..', 'src', 'itineraries', 'TripForm.tsx'), 'utf8');

  it.each(['Trip Title', 'Destination', 'Trip Description', 'Standouts', 'Best Time of Year'])(
    'draws %s unconditionally, so neither mode can quietly lose it',
    (label) => {
      expect(form).toContain(label);
      expect(form).not.toMatch(new RegExp(`shows${label.replace(/[^A-Za-z]/g, '')}`));
    },
  );

  it.each(MODES)('offers %s a cover picker', (mode) => {
    expect(tripFormFields(mode).showsCover).toBe(true);
  });

  it('takes ONE destination in both modes, as the S4.15 mock draws it (addendum 4)', () => {
    const form = readFileSync(join(__dirname, '..', 'src', 'itineraries', 'TripForm.tsx'), 'utf8');

    expect(form).toContain('label="Destination"');
    expect(form).not.toMatch(/Add destination/);
    expect(form).not.toMatch(/destinationsAreMulti/);
  });

  it('carries the trip-s one destination straight through — the list left the wire at S4.25', () => {
    const values = tripFormValuesFrom({
      title: 'Vietnam',
      destination: 'Hanoi',
      currency: 'VND',
      standouts: [],
    } as never);

    expect(values.destination).toBe('Hanoi');
    expect(updateRequestFrom(values).destination).toBe('Hanoi');
  });

  it('falls back to the PHP default when a legacy row carries no currency (S4.25 decision 1)', () => {
    const values = tripFormValuesFrom({
      title: 'Legacy',
      destination: 'Cebu',
      currency: null,
      standouts: [],
    } as never);

    expect(values.currency).toBe('PHP');
  });
});


describe('what each mode owns alone', () => {
  it('mints days from Duration on create only (S4.13 decision 8)', () => {
    expect(tripFormFields('create').showsDuration).toBe(true);
    expect(tripFormFields('edit').showsDuration).toBe(false);
  });

  it('opens the create form at 1 Day rather than blank (founder, 2026-08-09)', () => {
    expect(EMPTY_TRIP_FORM.duration).toBe('1');
    expect(createRequestFrom(EMPTY_TRIP_FORM).durationDays).toBe(1);
  });

  it('offers no blank duration — every choice mints at least one day', () => {
    const form = readFileSync(join(__dirname, '..', 'src', 'itineraries', 'TripForm.tsx'), 'utf8');

    expect(form).not.toMatch(/value: '', label: 'Days'/);
    expect(DURATION_CHOICES[0]).toBe(1);
  });

  it('dresses the duration dropdown in the form-s own input skin, not the shared picker-s', () => {
    const form = readFileSync(join(__dirname, '..', 'src', 'itineraries', 'TripForm.tsx'), 'utf8');

    expect(form).toMatch(/dropdown: \{\s*\.\.\.inputSurface/);
    expect(form).toMatch(/<DurationField/);
  });

  it('sizes the dropdown and the text inputs from ONE height, so the row cannot fall out of line', () => {
    const form = readFileSync(join(__dirname, '..', 'src', 'itineraries', 'TripForm.tsx'), 'utf8');
    const heights = form.match(/height: CONTROL_HEIGHT/g) ?? [];

    expect(heights).toHaveLength(2);
    expect(form).toMatch(/const CONTROL_HEIGHT = controls\.tripFormControlHeight/);
    expect(form).toMatch(/\[styles\.field, styles\.rowNarrow\]/);
  });

  it('edits dates on edit alone — the pickers came back at S4.25, reversing S4.19 addendum 3', () => {
    const form = readFileSync(join(__dirname, '..', 'src', 'itineraries', 'TripForm.tsx'), 'utf8');

    expect(form).toMatch(/ClearableDateField/);
    expect(form).toMatch(/Start date/);
    expect(form).toMatch(/End date/);
    expect(tripFormFields('edit').showsDates).toBe(true);
    expect(tripFormFields('create').showsDates).toBe(false);
  });

  it('picks the currency on edit alone — create stays one short form (S4.25 artboard 4)', () => {
    expect(tripFormFields('edit').showsCurrency).toBe(true);
    expect(tripFormFields('create').showsCurrency).toBe(false);
  });

  it('sends a set date and carries the currency (S4.25 ticket 02)', () => {
    const request = updateRequestFrom({
      ...blank,
      title: 'Kept',
      destination: 'Hanoi',
      currency: 'VND',
      startDate: '2027-03-01',
      endDate: '2027-03-09',
    });

    expect(request.startDate).toBe('2027-03-01');
    expect(request.endDate).toBe('2027-03-09');
    expect(request.currency).toBe('VND');
  });

  it('sends an EXPLICIT NULL for a cleared field, never an omission — absent means keep (S4.25 decision 4b)', () => {
    const request = updateRequestFrom({
      ...blank,
      title: 'Postponed',
      destination: 'Hanoi',
      startDate: '',
      endDate: '',
      description: '',
      bestTimeOfYear: '',
    });

    expect(request.startDate).toBeNull();
    expect(request.endDate).toBeNull();
    expect(request.description).toBeNull();
    expect(request.bestTimeOfYear).toBeNull();

    expect(Object.keys(request)).toEqual(
      expect.arrayContaining(['startDate', 'endDate', 'description', 'bestTimeOfYear']),
    );
  });

  it('reorders standouts on edit only — create keeps the S4.15 add-and-remove row', () => {
    expect(tripFormFields('edit').standoutsReorder).toBe(true);
    expect(tripFormFields('create').standoutsReorder).toBe(false);
  });
});


describe('the chrome each mode wears', () => {
  it('keeps the create flow S4.15 shipped', () => {
    expect(tripFormChrome('create')).toEqual({ headline: 'Plan a Trip', submitLabel: 'Create Trip' });
  });

  it('says Edit Trip and Save — the founder shortened "Save changes" (S4.19 decision 3)', () => {
    expect(tripFormChrome('edit')).toEqual({ headline: 'Edit Trip', submitLabel: 'Save' });
  });
});


describe('validation converges — one validator, two modes', () => {
  it.each(MODES)('requires a title in %s mode', (mode) => {
    expect(validateTripForm(mode, { ...filled, title: '   ' })).toBe('A title is required.');
  });

  it.each(MODES)('requires a destination in %s mode', (mode) => {
    expect(validateTripForm(mode, { ...filled, destination: '  ' })).toMatch(/destination/);
  });

  it.each(MODES)('rejects a title past the server-s limit in %s mode', (mode) => {
    expect(validateTripForm(mode, { ...filled, title: 'x'.repeat(121) })).toMatch(/120 characters/);
  });

  it.each(MODES)('rejects a description past the server-s limit in %s mode', (mode) => {
    expect(validateTripForm(mode, { ...filled, description: 'x'.repeat(4001) })).toMatch(/4000 characters/);
  });

  it.each(MODES)('accepts a filled form in %s mode', (mode) => {
    expect(validateTripForm(mode, filled)).toBeUndefined();
  });

  it('accepts a trip with no duration at all — the dreamer draft (S4.9)', () => {
    expect(validateTripForm('create', { ...filled, duration: '' })).toBeUndefined();
    expect(validateTripForm('create', { ...filled, duration: '5' })).toBeUndefined();
  });

  it('applies the duration rules to create only', () => {
    expect(validateTripForm('create', { ...filled, duration: 'five' })).toMatch(/whole number/);
    expect(validateTripForm('create', { ...filled, duration: '400' })).toMatch(/366 days/);
    expect(validateTripForm('edit', { ...filled, duration: 'five' })).toBeUndefined();
  });

  it('still guards dates it carries from the server, though no field can enter one (S4.19 addendum 3)', () => {
    expect(validateTripForm('edit', { ...filled, startDate: 'next June' })).toMatch(/2027-01-10/);
    expect(validateTripForm('edit', { ...filled, startDate: '2027-02-31' })).toMatch(/2027-01-10/);
    expect(
      validateTripForm('edit', { ...filled, startDate: '2027-06-10', endDate: '2027-06-03' }),
    ).toBe('A trip cannot end before it starts.');
  });

  it('accepts the date shapes a server row can hold — open-ended, and same-day', () => {
    expect(validateTripForm('edit', { ...filled, startDate: '2027-06-03' })).toBeUndefined();
    expect(validateTripForm('edit', { ...filled, endDate: '2027-06-03' })).toBeUndefined();
    expect(
      validateTripForm('edit', { ...filled, startDate: '2027-06-03', endDate: '2027-06-03' }),
    ).toBeUndefined();
  });

  it('rejects a blank form in both modes on the title first', () => {
    expect(validateTripForm('create', blank)).toBe('A title is required.');
    expect(validateTripForm('edit', blank)).toBe('A title is required.');
  });
});


describe('the currency-change confirm (S4.25 artboard 3)', () => {
  const priced = { ...EMPTY_TRIP_FORM, title: 'Trip', destination: 'Boracay', currency: 'PHP' };

  it('asks before relabelling money that exists', () => {
    expect(currencyChangeNeedsConfirming(priced, { ...priced, currency: 'USD' }, 3)).toBe(true);
  });

  it('stays silent when the currency did not change, however many prices there are', () => {
    expect(currencyChangeNeedsConfirming(priced, { ...priced }, 3)).toBe(false);
  });

  it('stays silent when there is no money to relabel', () => {
    expect(currencyChangeNeedsConfirming(priced, { ...priced, currency: 'USD' }, 0)).toBe(false);
  });
});


describe('counting the money a currency change would relabel', () => {
  it('counts only priced activities, across every day', () => {
    const trip = {
      days: [
        { activities: [{ costAmount: '1500.00' }, { costAmount: null }] },
        { activities: [{ costAmount: '600.00' }] },
      ],
    };

    expect(pricedActivityCount(trip)).toBe(2);
  });

  it('counts nothing on a plan with no prices at all', () => {
    expect(pricedActivityCount({ days: [{ activities: [{ costAmount: null }] }] })).toBe(0);
    expect(pricedActivityCount({ days: [] })).toBe(0);
  });
});
