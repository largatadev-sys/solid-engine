import { Alert } from 'react-native';
import { comingSoon } from '../src/components/comingSoon';
import {
  COMING_SOON_SURFACES,
  COMING_SOON_TAPPED,
  comingSoonMessage,
} from '../src/components/comingSoonMessage';
import { confirmDestructive } from '../src/components/confirmDestructive';
import { confirmDestructiveMessage } from '../src/components/confirmDestructiveMessage';



jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  (Alert.alert as jest.Mock).mockClear();
});

describe('comingSoonMessage — the wording both forks share', () => {
  it('names the affordance in the title and marks it coming soon', () => {
    expect(comingSoonMessage('search').title).toBe('Search — coming soon');
  });

  it('explains that the part is still being built', () => {
    expect(comingSoonMessage('search').body).toMatch(/still being built/);
  });

  it('names whatever affordance it is given', () => {
    expect(comingSoonMessage('coverPhoto').title).toBe('Cover photo — coming soon');
  });

  it('covers every greyed affordance S4.9 ships', () => {
    expect(Object.keys(COMING_SOON_SURFACES).sort()).toEqual(
      ['activityHistory', 'chat', 'coverPhoto', 'home', 'network', 'search'].sort(),
    );
  });
});

describe('comingSoon (native fork)', () => {
  it('shows an alert carrying the shared title and body', () => {
    comingSoon('search');

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Search — coming soon');
    expect(body).toMatch(/still being built/);
  });

  it('cannot grey an affordance without also measuring it (register #2)', () => {
    const logged = jest.spyOn(console, 'log').mockImplementation(() => {});

    comingSoon('chat');

    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining(`"event":"${COMING_SOON_TAPPED}"`),
    );
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('"surface":"chat"'));
    logged.mockRestore();
  });
});


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
    expect(onConfirm).not.toHaveBeenCalled();

    const destructive = buttons.find((b: { style?: string }) => b.style === 'destructive');
    destructive.onPress();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
