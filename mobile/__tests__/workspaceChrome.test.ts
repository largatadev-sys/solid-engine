import { docksItsOwnBar, laddersOn, LADDER_TAB } from '../src/itineraries/workspaceChrome';
import { WORKSPACE_TABS } from '../src/itineraries/WorkspaceTabRow';

const EVERY_TAB = WORKSPACE_TABS.map((tab) => tab.key);

describe('which workspace tab carries the lifecycle CTA', () => {
  it('shows it on Day-by-Day, where the plan the act is about lives', () => {
    expect(laddersOn('day-by-day')).toBe(true);
    expect(LADDER_TAB).toBe('day-by-day');
  });

  it('shows it nowhere else — Start Trip has no business docked under a roster or a chat', () => {
    const elsewhere = EVERY_TAB.filter((tab) => tab !== 'day-by-day').filter(laddersOn);

    expect(elsewhere).toEqual([]);
  });

  it('leaves every tab accounted for, so a new one cannot quietly inherit the rail', () => {
    expect(EVERY_TAB.filter(laddersOn)).toEqual(['day-by-day']);
  });
});

describe('which tabs pin their own bottom bar', () => {
  it('pins the roster’s Add traveler and the chat composer', () => {
    expect(docksItsOwnBar('travelers')).toBe(true);
    expect(docksItsOwnBar('chat')).toBe(true);
  });

  it('lets the others scroll their content as one page', () => {
    expect(docksItsOwnBar('day-by-day')).toBe(false);
    expect(docksItsOwnBar('polls')).toBe(false);
    expect(docksItsOwnBar('photo-dump')).toBe(false);
  });

  it('never docks a tab that also carries the rail — two stacked bars is the bug this fixes', () => {
    const both = EVERY_TAB.filter((tab) => docksItsOwnBar(tab) && laddersOn(tab));

    expect(both).toEqual([]);
  });
});
