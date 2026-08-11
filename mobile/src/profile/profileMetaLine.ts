export function profileMetaLine(handle: string | null, vanityNumber: string | null): string | null {
  const parts = [
    handle === null ? null : `@${handle}`,
    vanityNumber === null ? null : `#${vanityNumber}`,
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? null : parts.join(' · ');
}
