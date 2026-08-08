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


export function orderedBy<T extends { id: string }>(items: T[], order: string[] | null): T[] {
  if (order === null) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  if (order.length !== items.length || order.some((id) => !byId.has(id))) return items;
  return order.map((id) => byId.get(id) as T);
}


export function movedTo(ids: string[], fromIndex: number, toIndex: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved as string);
  return next;
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
