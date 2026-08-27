let peeked = false;


export function claimSwipeHint(): boolean {
  if (peeked) {
    return false;
  }
  peeked = true;
  return true;
}


export function resetSwipeHint(): void {
  peeked = false;
}
