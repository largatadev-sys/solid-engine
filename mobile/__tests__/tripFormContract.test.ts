import { readFileSync } from 'fs';
import { join } from 'path';
import {
  tripFormChrome,
  tripFormFields,
  validateTripForm,
  type TripFormMode,
  type TripFormValues,
} from '../src/itineraries/tripFormContract';


const MODES: TripFormMode[] = ['create', 'edit'];


const blank: TripFormValues = {
  title: '',
  destinations: [''],
  description: '',
  standouts: [''],
  bestTimeOfYear: '',
  duration: '',
  startDate: '',
  endDate: '',
};


const filled: TripFormValues = { ...blank, title: 'Hokkaido in winter', destinations: ['Sapporo'] };


describe('what both modes share — the fields that stopped drifting (S4.19 decision 3)', () => {
  const form = readFileSync(join(__dirname, '..', 'src', 'itineraries', 'TripForm.tsx'), 'utf8');

  it.each(['Trip Title', 'Destinations', 'Trip Description', 'Standouts', 'Best Time of Year'])(
    'draws %s unconditionally, so neither mode can quietly lose it',
    (label) => {
      expect(form).toContain(label);
      expect(form).not.toMatch(new RegExp(`shows${label.replace(/[^A-Za-z]/g, '')}`));
    },
  );

  it.each(MODES)('offers %s a cover picker', (mode) => {
    expect(tripFormFields(mode).showsCover).toBe(true);
  });

  it.each(MODES)('lets %s add more than one destination — multi in both modes', (mode) => {
    expect(tripFormFields(mode).destinationsAreMulti).toBe(true);
  });
});


describe('what each mode owns alone', () => {
  it('mints days from Duration on create only (S4.13 decision 8)', () => {
    expect(tripFormFields('create').showsDuration).toBe(true);
    expect(tripFormFields('edit').showsDuration).toBe(false);
  });

  it('edits dates on edit only — and no Duration there, because dates never touch the day list', () => {
    expect(tripFormFields('edit').showsDates).toBe(true);
    expect(tripFormFields('create').showsDates).toBe(false);
    expect(tripFormFields('edit').showsDuration).toBe(false);
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

  it.each(MODES)('requires at least one destination in %s mode', (mode) => {
    expect(validateTripForm(mode, { ...filled, destinations: ['  ', ''] })).toMatch(/destination/);
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

  it('applies the date rules to edit only', () => {
    expect(validateTripForm('edit', { ...filled, startDate: 'next June' })).toMatch(/2027-01-10/);
    expect(validateTripForm('edit', { ...filled, startDate: '2027-02-31' })).toMatch(/2027-01-10/);
    expect(
      validateTripForm('edit', { ...filled, startDate: '2027-06-10', endDate: '2027-06-03' }),
    ).toBe('A trip cannot end before it starts.');
    expect(validateTripForm('create', { ...filled, startDate: 'next June' })).toBeUndefined();
  });

  it('accepts an open-ended edit — a start with no end, and an end with no start', () => {
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
