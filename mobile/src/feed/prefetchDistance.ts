export const PREFETCH_CARDS = 3;

const FALLBACK = 0.5;


export function prefetchThreshold(cardHeight: number, viewportHeight: number): number {
  if (cardHeight <= 0 || viewportHeight <= 0) {
    return FALLBACK;
  }
  return (PREFETCH_CARDS * cardHeight) / viewportHeight;
}
