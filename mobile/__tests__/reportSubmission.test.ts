import { ApiError } from '../src/api/ApiError';
import { newReportDraft } from '../src/feedback/reportDraft';
import { REPORT_FAILURES, failureOf } from '../src/feedback/reportFailure';
import { submitReport } from '../src/feedback/submitReport';
import { setTokenSource, resetTokenSource } from '../src/auth/tokenSource';
import type { PickedPhoto } from '../src/media/pickedPhoto';
import { REPORTS_PATH } from '../src/repositories/reportRepository';

jest.mock('../src/media/appendPhoto', () => ({
  appendPhoto: jest.fn((part: FormData, field: string, photo: { name: string }) =>
    part.append(field, photo.name),
  ),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const accepted = (status: number, reportId: string): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => ({ reportId }) }) as Response;

beforeEach(() => {
  mockFetch.mockReset();
  resetTokenSource();
});


describe('submitting a report', () => {
  it('sends the multipart to the reports route', async () => {
    const draft = newReportDraft(['(tabs)', '(home)']);
    mockFetch.mockResolvedValue(accepted(201, draft.reportId));

    await submitReport(draft, { type: 'problem', description: 'It broke.', screenshots: [] });

    expect(String(mockFetch.mock.calls[0][0])).toContain(REPORTS_PATH);
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
  });

  it('carries the draft id, the draft screen and the build, all in the report part', async () => {
    const draft = newReportDraft(['(tabs)', '(trips)', 'itineraries', '[id]']);
    mockFetch.mockResolvedValue(accepted(201, draft.reportId));

    await submitReport(draft, { type: 'idea', description: 'Pin a day.', screenshots: [] });

    const sent = JSON.parse(partIn(mockFetch.mock.calls[0][1].body, 'report'));
    expect(sent.reportId).toBe(draft.reportId);
    expect(sent.screen).toBe('Trip overview · (tabs)/(trips)/itineraries/[id]');
    expect(sent.type).toBe('idea');
    expect(sent.description).toBe('Pin a day.');
    expect(sent.appVersion).toBeDefined();
    expect(['android', 'ios', 'web']).toContain(sent.platform);
  });

  it('re-sends the SAME reportId on a retry, so a retry is a replay and never a duplicate', async () => {
    const draft = newReportDraft(['(tabs)', '(home)']);
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    mockFetch.mockResolvedValue(accepted(200, draft.reportId));

    await expect(
      submitReport(draft, { type: 'problem', description: 'Twice.', screenshots: [] }),
    ).rejects.toBeInstanceOf(ApiError);
    await submitReport(draft, { type: 'problem', description: 'Twice.', screenshots: [] });

    const first = JSON.parse(partIn(mockFetch.mock.calls[0][1].body, 'report'));
    const second = JSON.parse(partIn(mockFetch.mock.calls[1][1].body, 'report'));
    expect(second.reportId).toBe(first.reportId);
  });

  it('sends no Authorization header when nobody is signed in', async () => {
    const draft = newReportDraft(['sign-in']);
    mockFetch.mockResolvedValue(accepted(201, draft.reportId));

    await submitReport(draft, { type: 'problem', description: 'Cannot get in.', screenshots: [] });

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('attaches the bearer when a traveler is signed in, so the backend can attribute the report', async () => {
    setTokenSource(async () => 'a-token');
    const draft = newReportDraft(['(tabs)', '(home)']);
    mockFetch.mockResolvedValue(accepted(201, draft.reportId));

    await submitReport(draft, { type: 'problem', description: 'Signed in.', screenshots: [] });

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe('Bearer a-token');
  });

  it('sends at most three screenshot parts', async () => {
    const draft = newReportDraft(['(tabs)', '(home)']);
    mockFetch.mockResolvedValue(accepted(201, draft.reportId));

    await submitReport(draft, {
      type: 'problem',
      description: 'Four of them.',
      screenshots: [shot('a'), shot('b'), shot('c'), shot('d')],
    });

    expect(countIn(mockFetch.mock.calls[0][1].body, 'screenshot')).toBe(3);
  });
});


describe('how a failed submission reads to the traveler', () => {
  it('offers a retry when the network was unreachable', () => {
    expect(failureOf(ApiError.offline())).toEqual({
      message: REPORT_FAILURES.offline,
      retryable: true,
    });
  });

  it('says the images are too large on a 413, and does not offer a pointless retry', () => {
    expect(failureOf(status(413))).toEqual({
      message: REPORT_FAILURES.tooLarge,
      retryable: false,
    });
  });

  it('says to try later on a 429, which IS worth retrying', () => {
    expect(failureOf(status(429))).toEqual({
      message: REPORT_FAILURES.rateLimited,
      retryable: true,
    });
  });

  it('distinguishes a rejected payload from an outage', () => {
    expect(failureOf(status(400)).message).toBe(REPORT_FAILURES.rejected);
    expect(failureOf(status(503)).message).toBe(REPORT_FAILURES.unexpected);
  });

  it('never leaks a raw thrown value as copy', () => {
    expect(failureOf(new Error('kaboom')).message).toBe(REPORT_FAILURES.unexpected);
  });
});


function status(code: number): ApiError {
  return new ApiError({ code: 'X', message: 'x', status: code });
}


function shot(name: string): PickedPhoto {
  return { uri: `file://${name}.jpg`, name: `${name}.jpg`, mimeType: 'image/jpeg' };
}


function partIn(body: FormData, field: string): string {
  const value = body.get(field);
  if (typeof value !== 'string') throw new Error(`the ${field} part is not a string`);
  return value;
}


function countIn(body: FormData, field: string): number {
  return body.getAll(field).length;
}
