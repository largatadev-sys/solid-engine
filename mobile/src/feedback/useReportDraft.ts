import { useSegments } from 'expo-router';
import { useCallback } from 'react';
import type { ReportDraft } from './reportDraft';
import { newReportDraft } from './reportDraft';


export function useReportDraft(): () => ReportDraft {
  const segments = useSegments();
  return useCallback(() => newReportDraft(segments), [segments]);
}
