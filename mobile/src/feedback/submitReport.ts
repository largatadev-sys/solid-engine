import type { ReportDraft } from './reportDraft';
import { releaseDraft } from './reportDraft';
import type { ReportFailure } from './reportFailure';
import { failureOf } from './reportFailure';
import type { ReportFields, SubmittedReport } from '../repositories/reportRepository';
import { reportRepository } from '../repositories/reportRepository';


export async function submitReport(
  draft: ReportDraft,
  fields: ReportFields,
): Promise<SubmittedReport> {
  const submitted = await reportRepository.submit(draft, fields);
  releaseDraft(draft.reportId);
  return submitted;
}


export function reportFailureOf(thrown: unknown): ReportFailure {
  return failureOf(thrown);
}
