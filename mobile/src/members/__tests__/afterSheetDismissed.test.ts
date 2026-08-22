import { afterSheetDismissed as raiseOnNative } from '../afterSheetDismissed.native';
import { afterSheetDismissed as raiseOnWeb } from '../afterSheetDismissed.web';
import { travelerMotion } from '../../theme/workspaceTokens';

describe('afterSheetDismissed on native', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not raise while the sheet is still on screen', () => {
    const raise = jest.fn();

    raiseOnNative(raise);

    expect(raise).not.toHaveBeenCalled();
  });

  it('waits at least as long as the sheet takes to leave', () => {
    const raise = jest.fn();

    raiseOnNative(raise);
    jest.advanceTimersByTime(travelerMotion.sheetOutMs - 1);

    expect(raise).not.toHaveBeenCalled();
  });

  it('raises once the dismiss animation has finished', () => {
    const raise = jest.fn();

    raiseOnNative(raise);
    jest.advanceTimersByTime(travelerMotion.sheetOutMs);

    expect(raise).toHaveBeenCalledTimes(1);
  });
});

describe('afterSheetDismissed on web', () => {
  it('raises inside the click handler, so the gesture still authorizes the dialog', () => {
    const raise = jest.fn();

    raiseOnWeb(raise);

    expect(raise).toHaveBeenCalledTimes(1);
  });

  it('schedules nothing, because a deferred confirm is suppressed by the browser', () => {
    jest.useFakeTimers();
    const scheduled = jest.spyOn(global, 'setTimeout');

    raiseOnWeb(jest.fn());

    expect(scheduled).not.toHaveBeenCalled();
    scheduled.mockRestore();
    jest.useRealTimers();
  });
});
