export function openInMaps(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank');
}
