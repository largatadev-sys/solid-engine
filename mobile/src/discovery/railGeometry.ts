export function railCardWidth(railWidth: number, gutter: number, peek: number): number {
  if (railWidth <= 0) {
    return 0;
  }
  return Math.max(0, railWidth - gutter - peek);
}


export function railPitch(cardWidth: number, gap: number): number {
  return cardWidth <= 0 ? 0 : cardWidth + gap;
}


export function railPageCount(cardCount: number, hasEndCard: boolean): number {
  return cardCount + (hasEndCard ? 1 : 0);
}
