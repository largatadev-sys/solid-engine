const previews = new Map<string, string>();


export function rememberCoverPreview(itineraryId: string, localUri: string): void {
  previews.set(itineraryId, localUri);
}


export function coverPreviewFor(itineraryId: string): string | null {
  return previews.get(itineraryId) ?? null;
}


export function forgetCoverPreview(itineraryId: string): void {
  previews.delete(itineraryId);
}
