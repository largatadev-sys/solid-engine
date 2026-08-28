import { heldDraft, newReportDraft, releaseDraft } from '../src/feedback/reportDraft';

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;


describe('a report draft', () => {
  it('mints a UUID the backend will accept as an idempotency key', () => {
    expect(newReportDraft(['(tabs)', '(home)']).reportId).toMatch(UUID_SHAPE);
  });

  it('mints a distinct id per draft, so two reports are never confused for a replay', () => {
    const first = newReportDraft(['(tabs)', '(home)']);
    const second = newReportDraft(['(tabs)', '(home)']);

    expect(first.reportId).not.toBe(second.reportId);
  });

  it('captures the screen at the moment it is created', () => {
    expect(newReportDraft(['(tabs)', '(home)']).screen).toBe('Home feed · (tabs)/(home)');
  });

  it('keeps that screen even after the traveler navigates on, because the draft holds it', () => {
    const opened = newReportDraft(['(tabs)', '(trips)', 'itineraries', '[id]']);

    newReportDraft(['(tabs)', '(home)']);

    expect(heldDraft(opened.reportId)?.screen).toBe(
      'Trip overview · (tabs)/(trips)/itineraries/[id]',
    );
    expect(opened.screen).toBe('Trip overview · (tabs)/(trips)/itineraries/[id]');
  });

  it('survives outside any component, which is what makes it outlive the form navigating', () => {
    const draft = newReportDraft(['(tabs)', '(profile)', 'profile']);

    expect(heldDraft(draft.reportId)).toEqual(draft);
  });

  it('is forgotten once released', () => {
    const draft = newReportDraft(['(tabs)', '(home)']);

    releaseDraft(draft.reportId);

    expect(heldDraft(draft.reportId)).toBeUndefined();
  });
});
