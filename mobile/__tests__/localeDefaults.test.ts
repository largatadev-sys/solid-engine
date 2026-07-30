import { COUNTRIES, countryByCode } from '../src/onboarding/countries';
import {
  HOME_MARKET,
  currencyForCountry,
  defaultsForRegion,
} from '../src/onboarding/localeDefaults';

describe('travel-setup defaults from the device region', () => {
  it('a readable region prefills its own country and currency', () => {
    expect(defaultsForRegion('PH')).toEqual({ country: 'PH', currency: 'PHP' });
    expect(defaultsForRegion('JP')).toEqual({ country: 'JP', currency: 'JPY' });
    expect(defaultsForRegion('DE')).toEqual({ country: 'DE', currency: 'EUR' });
  });

  it('casing and whitespace from the platform do not defeat the lookup', () => {
    expect(defaultsForRegion(' ph ')).toEqual({ country: 'PH', currency: 'PHP' });
    expect(defaultsForRegion('jp')).toEqual({ country: 'JP', currency: 'JPY' });
  });

  it('an unreadable locale falls back to the home market', () => {
    expect(defaultsForRegion(null)).toEqual({ country: HOME_MARKET.country, currency: HOME_MARKET.currency });
    expect(defaultsForRegion(undefined)).toEqual({ country: 'PH', currency: 'PHP' });
    expect(defaultsForRegion('')).toEqual({ country: 'PH', currency: 'PHP' });
    expect(defaultsForRegion('ZZ')).toEqual({ country: 'PH', currency: 'PHP' });
  });

  it('the home market is the Philippines, on the record', () => {
    expect(HOME_MARKET).toEqual({ country: 'PH', currency: 'PHP' });
  });

  it('choosing a country derives its currency', () => {
    expect(currencyForCountry('SG')).toBe('SGD');
    expect(currencyForCountry('FR')).toBe('EUR');
  });

  it('an unknown country still yields a usable currency rather than an empty field', () => {
    expect(currencyForCountry('ZZ')).toBe('PHP');
  });
});

describe('the country list itself', () => {
  it('leads with the home market so the common case is the first row', () => {
    expect(COUNTRIES[0]?.code).toBe('PH');
  });

  it('is alphabetical after that, however the literal happens to be maintained', () => {
    const names = COUNTRIES.slice(1).map((country) => country.name);

    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));
  });

  it('covers enough of the world that a readable locale rarely falls back', () => {
    const REGIONS_WHOSE_TRAVELERS_WOULD_OTHERWISE_BE_STUCK_ON_PH = [
      'RU', 'VE', 'GH', 'KZ', 'RS', 'EE', 'LT', 'LV', 'CR', 'PA', 'DO', 'UY', 'PY', 'BO',
      'ET', 'UG', 'ZM', 'ZW', 'MU', 'JO', 'LB', 'OM', 'IQ', 'GE', 'AM', 'AZ', 'MN', 'BT',
    ];

    for (const region of REGIONS_WHOSE_TRAVELERS_WOULD_OTHERWISE_BE_STUCK_ON_PH) {
      expect(defaultsForRegion(region).country)
        .toBe(region);
    }

    expect(COUNTRIES.length).toBeGreaterThan(150);
  });

  it('and the fallback still means what it says: an UNREADABLE locale, not an unlisted one', () => {
    expect(defaultsForRegion('ZZ')).toEqual({ country: 'PH', currency: 'PHP' });
  });

  it('carries no duplicate codes', () => {
    const codes = COUNTRIES.map((country) => country.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every entry has an ISO-shaped country and currency code', () => {
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.currency).toMatch(/^[A-Z]{3}$/);
      expect(country.name.length).toBeGreaterThan(1);
    }
  });

  it('lookup is by code and tolerates nothing being passed', () => {
    expect(countryByCode('PH')?.name).toBe('Philippines');
    expect(countryByCode(null)).toBeUndefined();
    expect(countryByCode('nope')).toBeUndefined();
  });
});
