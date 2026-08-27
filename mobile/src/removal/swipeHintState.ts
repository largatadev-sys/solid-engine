let shown = false;


export function claimSwipeHint(): boolean {
  if (shown) {
    return false;
  }
  shown = true;
  return true;
}
