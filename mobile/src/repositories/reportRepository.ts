import { apiClient } from '../api/apiClient';
import { appVersion, reportPlatform } from '../feedback/appBuild';
import type { DeviceContext } from '../feedback/deviceContext';
import type { ReportDraft } from '../feedback/reportDraft';
import { appendPhoto } from '../media/appendPhoto';
import type { PickedPhoto } from '../media/pickedPhoto';

export const REPORTS_PATH = '/v1/reports';

export const MAX_REPORT_SCREENSHOTS = 3;

export type ReportType = 'problem' | 'idea';

export type ReportFields = {
  readonly type: ReportType;
  readonly description: string;
  readonly screenshots: readonly PickedPhoto[];
};

export type SubmittedReport = {
  readonly reportId: string;
};


export const reportRepository = {

  async submit(
    draft: ReportDraft,
    fields: ReportFields,
    device: DeviceContext,
  ): Promise<SubmittedReport> {
    const part = new FormData();
    part.append(
      'report',
      JSON.stringify({
        reportId: draft.reportId,
        type: fields.type,
        description: fields.description,
        screen: draft.screen,
        appVersion: appVersion(),
        platform: reportPlatform(),
        ...device,
      }),
    );
    fields.screenshots
      .slice(0, MAX_REPORT_SCREENSHOTS)
      .forEach((screenshot) => appendPhoto(part, 'screenshot', screenshot));

    return apiClient.upload<SubmittedReport>(REPORTS_PATH, part);
  },
};
