import {
  asVisibility,
  DEPLOYED_DEV_BASE_URL,
  dockVisible,
  type DockVisibility,
} from '../src/feedback/feedbackVisibility';

const LANES = {
  localhost: 'http://localhost:8080',
  emulator: 'http://10.0.2.2:8080',
  deployedDev: DEPLOYED_DEV_BASE_URL,
  prod: 'https://api.largata.com',
  typo: 'https://api-dev.largata.co',
  absent: '',
} as const;

describe('dockVisible', () => {
  describe("with the visibility left at 'default'", () => {
    it('shows the dock only on a build baked against deployed dev', () => {
      expect(dockVisible('default', LANES.deployedDev)).toBe(true);
    });

    it.each([
      ['localhost', LANES.localhost],
      ['the emulator alias', LANES.emulator],
      ['production', LANES.prod],
      ['a typo of deployed dev', LANES.typo],
      ['an absent base url', LANES.absent],
    ])('hides the dock on %s', (_lane, baseUrl) => {
      expect(dockVisible('default', baseUrl)).toBe(false);
    });
  });

  it("'revealed' beats a non-dev lane", () => {
    Object.values(LANES).forEach((baseUrl) => {
      expect(dockVisible('revealed', baseUrl)).toBe(true);
    });
  });

  it("'hidden' beats the deployed-dev default", () => {
    Object.values(LANES).forEach((baseUrl) => {
      expect(dockVisible('hidden', baseUrl)).toBe(false);
    });
  });
});

describe('asVisibility', () => {
  it.each(['revealed', 'hidden'] as const)('keeps the stored value %s', (stored) => {
    expect(asVisibility(stored)).toBe<DockVisibility>(stored);
  });

  it.each([
    ['an unknown string', 'visible'],
    ['a number', 3],
    ['null', null],
    ['undefined', undefined],
    ['an object', {}],
  ])("falls back to 'default' for %s", (_case, stored) => {
    expect(asVisibility(stored)).toBe<DockVisibility>('default');
  });
});
