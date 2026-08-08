export function landingSlot(
  translationY: number,
  fromIndex: number,
  count: number,
  rowPitch: number,
): number {
  'worklet';
  if (rowPitch <= 0) return fromIndex;
  const travelled = translationY / rowPitch;
  const slots = travelled < 0 ? -Math.round(-travelled) : Math.round(travelled);
  return Math.max(0, Math.min(fromIndex + slots, count - 1));
}


export function displacementFor(
  index: number,
  heldIndex: number,
  targetIndex: number,
  rowPitch: number,
): number {
  'worklet';
  if (index > heldIndex && index <= targetIndex) return -rowPitch;
  if (index < heldIndex && index >= targetIndex) return rowPitch;
  return 0;
}


export function reorderActionsFor(
  index: number,
  count: number,
): Array<{ name: 'moveUp' | 'moveDown'; label: string }> {
  const actions: Array<{ name: 'moveUp' | 'moveDown'; label: string }> = [];
  if (index > 0) actions.push({ name: 'moveUp', label: 'Move up' });
  if (index < count - 1) actions.push({ name: 'moveDown', label: 'Move down' });
  return actions;
}
