
export function validateActivityForm(form: {
  title: string;
  timeOfDay: string;
  costAmount: string;
  costCurrency: string;
  bookingPriceAmount?: string;
}): string | undefined {
  if (form.title.trim() === '') return 'An activity needs a title.';
  if (form.title.trim().length > 200) return 'A title may be at most 200 characters.';

  const time = form.timeOfDay.trim();
  if (time !== '' && !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) {
    return 'A time of day must look like 14:00.';
  }

  const amount = form.costAmount.trim();
  const currency = form.costCurrency.trim();
  if (amount !== '' && !/^\d+(\.\d{1,2})?$/.test(amount)) {
    return 'An estimated cost must be a number like 500 or 500.00.';
  }
  if (amount !== '' && currency === '') return 'An estimated cost needs a currency (e.g. PHP).';

  const bookingAmount = (form.bookingPriceAmount ?? '').trim();
  if (bookingAmount !== '' && !/^\d+(\.\d{1,2})?$/.test(bookingAmount)) {
    return 'A booking price must be a number like 1800 or 1800.00.';
  }

  return undefined;
}
