const SIGNS: Record<string, string> = {
  AUD: 'A$',
  CAD: 'C$',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
  HKD: 'HK$',
  IDR: 'Rp',
  INR: '₹',
  JPY: '¥',
  KRW: '₩',
  MYR: 'RM',
  NZD: 'NZ$',
  PHP: '₱',
  SGD: 'S$',
  THB: '฿',
  TWD: 'NT$',
  USD: '$',
  VND: '₫',
};


export function currencySign(code: string): string {
  return SIGNS[code.trim().toUpperCase()] ?? code.trim().toUpperCase();
}


export function isKnownCurrency(code: string): boolean {
  return SIGNS[code.trim().toUpperCase()] !== undefined;
}
