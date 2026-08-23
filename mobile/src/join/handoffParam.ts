export const APP_HANDOFF_PARAM = 'app';

export type StripHandoffParam = () => void;

export function urlWithoutHandoffParam(href: string): string | null {
  const url = new URL(href);
  if (!url.searchParams.has(APP_HANDOFF_PARAM)) return null;

  url.searchParams.delete(APP_HANDOFF_PARAM);
  return url.pathname + url.search + url.hash;
}
