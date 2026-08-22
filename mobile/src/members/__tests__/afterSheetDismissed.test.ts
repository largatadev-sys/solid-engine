import { afterSheetDismissed } from '../afterSheetDismissed';
import { travelerMotion } from '../../theme/workspaceTokens';

describe('afterSheetDismissed', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not raise while the sheet is still on screen', () => {
    const raise = jest.fn();

    afterSheetDismissed(raise);

    expect(raise).not.toHaveBeenCalled();
  });

  it('raises once the dismiss animation has finished', () => {
    const raise = jest.fn();

    afterSheetDismissed(raise);
    jest.advanceTimersByTime(travelerMotion.sheetOutMs);

    expect(raise).toHaveBeenCalledTimes(1);
  });

  it('waits at least as long as the sheet takes to leave', () => {
    const raise = jest.fn();

    afterSheetDismissed(raise);
    jest.advanceTimersByTime(travelerMotion.sheetOutMs - 1);

    expect(raise).not.toHaveBeenCalled();
  });
});
