export type SupportedCurrency = {
  readonly code: string;
  readonly sign: string;
  readonly name: string;
};


export const DEFAULT_TRIP_CURRENCY = 'PHP';


export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = [
  { code: 'PHP', sign: '₱', name: 'Philippine Peso' },
  { code: 'USD', sign: '$', name: 'US Dollar' },
  { code: 'EUR', sign: '€', name: 'Euro' },
  { code: 'JPY', sign: '¥', name: 'Japanese Yen' },
  { code: 'KRW', sign: '₩', name: 'South Korean Won' },
  { code: 'CNY', sign: '¥', name: 'Chinese Yuan' },
  { code: 'GBP', sign: '£', name: 'British Pound' },
  { code: 'AUD', sign: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', sign: 'C$', name: 'Canadian Dollar' },
  { code: 'NZD', sign: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SGD', sign: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', sign: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'TWD', sign: 'NT$', name: 'New Taiwan Dollar' },
  { code: 'THB', sign: '฿', name: 'Thai Baht' },
  { code: 'MYR', sign: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', sign: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'VND', sign: '₫', name: 'Vietnamese Dong' },
  { code: 'INR', sign: '₹', name: 'Indian Rupee' },
];


const BY_CODE: Readonly<Record<string, SupportedCurrency>> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((currency) => [currency.code, currency]),
);


const WIDER_SIGNS: Readonly<Record<string, string>> = {
  BRL: 'R$',
  MXN: 'Mex$',
  ZAR: 'R',
  TRY: '₺',
  RUB: '₽',
  ILS: '₪',
  NGN: '₦',
  UAH: '₴',
  KHR: '៛',
  LAK: '₭',
  MNT: '₮',
  BDT: '৳',
  LKR: 'Rs',
  NPR: 'Rs',
  PKR: 'Rs',
  CHF: 'CHF',
};


export function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase();
}


export function currencySign(code: string): string {
  const normalized = normalizeCurrency(code);
  return BY_CODE[normalized]?.sign ?? WIDER_SIGNS[normalized] ?? normalized;
}


export function isKnownCurrency(code: string): boolean {
  return BY_CODE[normalizeCurrency(code)] !== undefined;
}


export function currencyPickerLabel(code: string): string {
  const normalized = normalizeCurrency(code);
  const supported = BY_CODE[normalized];
  return supported === undefined
    ? `${currencySign(normalized)}  ${normalized}`
    : `${supported.sign}  ${supported.code} — ${supported.name}`;
}


export function currencyLabel(code: string): string {
  const normalized = normalizeCurrency(code);
  const sign = BY_CODE[normalized]?.sign ?? WIDER_SIGNS[normalized];
  return sign === undefined ? normalized : `${normalized} (${sign})`;
}
