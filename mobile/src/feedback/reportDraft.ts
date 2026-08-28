import { screenStringOf } from './reportScreen';

export type ReportDraft = {
  readonly reportId: string;
  readonly screen: string;
};

const drafts = new Map<string, ReportDraft>();


export function newReportDraft(segments: readonly string[]): ReportDraft {
  const draft: ReportDraft = { reportId: mintReportId(), screen: screenStringOf(segments) };
  drafts.set(draft.reportId, draft);
  return draft;
}


export function heldDraft(reportId: string): ReportDraft | undefined {
  return drafts.get(reportId);
}


export function releaseDraft(reportId: string): void {
  drafts.delete(reportId);
}


function mintReportId(): string {
  const bytes = randomBytes(16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}


function randomBytes(count: number): number[] {
  const source = globalThis.crypto;
  if (source !== undefined && typeof source.getRandomValues === 'function') {
    return Array.from(source.getRandomValues(new Uint8Array(count)));
  }
  return Array.from({ length: count }, () => Math.floor(Math.random() * 256));
}
