import { countryByCode } from './countries';


export const HOME_MARKET = { country: 'PH', currency: 'PHP' } as const;


export interface TravelDefaults {
  readonly country: string;
  readonly currency: string;
}


export function defaultsForRegion(regionCode: string | null | undefined): TravelDefaults {
  const match = countryByCode(regionCode);
  if (match === undefined) return { country: HOME_MARKET.country, currency: HOME_MARKET.currency };
  return { country: match.code, currency: match.currency };
}


export function currencyForCountry(countryCode: string): string {
  return countryByCode(countryCode)?.currency ?? HOME_MARKET.currency;
}
