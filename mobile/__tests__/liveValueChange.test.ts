import { changedSince } from '../src/components/liveValueChange';

describe('deciding when a value announces itself', () => {
  it('says nothing on the first render, because arriving is not changing', () => {
    expect(changedSince(undefined, 'Palawan · 3 days')).toBe(false);
  });

  it('announces a genuine change', () => {
    expect(changedSince('Palawan · 3 days', 'Palawan · 5 days')).toBe(true);
  });

  it('stays quiet when a re-render hands back the same value', () => {
    expect(changedSince('Palawan · 3 days', 'Palawan · 3 days')).toBe(false);
  });

  it('stays quiet for a value that became null, which is an exit rather than a change', () => {
    expect(changedSince('Currently being edited', null)).toBe(false);
  });

  it('announces a value arriving where there was none, which IS a change once mounted', () => {
    expect(changedSince(null, 'Currently being edited')).toBe(true);
  });
});
