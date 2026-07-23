import { Alert } from 'react-native';
import { comingSoon } from '../src/components/comingSoon';
import { comingSoonMessage } from '../src/components/comingSoonMessage';
import { confirmDestructive } from '../src/components/confirmDestructive';
import { confirmDestructiveMessage } from '../src/components/confirmDestructiveMessage';

/**
 * The grey-out shell's graceful-tap message (S1.3, ticket 05). The components that use it (BottomNav,
 * GreyedMediaTile, the disabled Preview CTA) are thin wrappers around this call; what is worth pinning
 * is that a tap on a not-yet affordance produces a message naming what is coming — never a dead tap
 * and never silence (the S0.5 pattern). Component rendering is not unit-tested here (jest-expo renders
 * nothing under the preset — recorded across the query tests), so this is the seam that is.
 *
 * <p><strong>Note the fork this file cannot see.</strong> Jest resolves `comingSoon` to the `.native`
 * fork, so these tests exercise the `Alert` path only. The `.web` fork exists precisely because
 * `Alert.alert` is a no-op on react-native-web — a gap no unit test in this project can catch, which
 * is why the shared wording lives in `comingSoonMessage` (tested here, used by both) and the web path
 * is proven by driving the preview container.
 */

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  (Alert.alert as jest.Mock).mockClear();
});

describe('comingSoonMessage — the wording both forks share', () => {
  it('names the affordance in the title and marks it coming soon', () => {
    expect(comingSoonMessage('Discover').title).toBe('Discover — coming soon');
  });

  it('explains that the part is still being built', () => {
    expect(comingSoonMessage('Discover').body).toMatch(/still being built/);
  });

  it('names whatever affordance it is given', () => {
    expect(comingSoonMessage('Cover photo').title).toBe('Cover photo — coming soon');
  });
});

describe('comingSoon (native fork)', () => {
  it('shows an alert carrying the shared title and body', () => {
    comingSoon('Discover');

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Discover — coming soon');
    expect(body).toMatch(/still being built/);
  });
});

/**
 * The destructive confirm (S1.3). Forked for the same reason as `comingSoon` — and more urgently:
 * this confirm's callback lives *inside* the alert, so on the web the unforked version meant the
 * delete silently never happened. Jest resolves the `.native` fork; the `.web` path is proven by
 * driving the preview container.
 */
describe('confirmDestructive', () => {
  it('names what is being deleted and warns it cannot be undone', () => {
    expect(confirmDestructiveMessage('Day 2').title).toBe('Delete Day 2?');
    expect(confirmDestructiveMessage('Day 2').body).toMatch(/cannot be undone/);
  });

  it('(native) asks before acting, and runs the action only from the Delete button', () => {
    const onConfirm = jest.fn();
    confirmDestructive('Day 2', onConfirm);

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Delete Day 2?');
    // Not called merely by asking — the whole point of a confirm.
    expect(onConfirm).not.toHaveBeenCalled();

    const destructive = buttons.find((b: { style?: string }) => b.style === 'destructive');
    destructive.onPress();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
