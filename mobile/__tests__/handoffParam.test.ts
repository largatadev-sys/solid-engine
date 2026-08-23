import { APP_HANDOFF_PARAM, urlWithoutHandoffParam } from '../src/join/handoffParam';

describe('the hand-off param the preview page redirects with', () => {
  it('is stripped so a url copied from the address bar still unfurls for whoever it is pasted to', () => {
    expect(urlWithoutHandoffParam('https://largata.test/join/abc?v=3&app=1')).toBe(
      '/join/abc?v=3',
    );
  });

  it('leaves the version alone — that one is load-bearing for the card cache', () => {
    expect(urlWithoutHandoffParam('https://largata.test/join/abc?v=9&app=1')).toContain('v=9');
  });

  it('reports nothing to do when the param is absent, so no history entry is rewritten', () => {
    expect(urlWithoutHandoffParam('https://largata.test/join/abc?v=3')).toBeNull();
  });

  it('keeps every other param a future story might add', () => {
    expect(urlWithoutHandoffParam('https://largata.test/join/abc?v=3&app=1&ref=x')).toBe(
      '/join/abc?v=3&ref=x',
    );
  });

  it('keeps the fragment, which expo-router may be using for navigation state', () => {
    expect(urlWithoutHandoffParam('https://largata.test/join/abc?app=1#top')).toBe('/join/abc#top');
  });

  it('names the param once so the app and the Caddy matcher cannot disagree about it', () => {
    expect(APP_HANDOFF_PARAM).toBe('app');
  });
});
