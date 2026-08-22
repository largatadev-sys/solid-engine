import { Alert } from 'react-native';
import { comingSoon } from '../src/components/comingSoon';
import {
  COMING_SOON_SURFACES,
  COMING_SOON_TAPPED,
  comingSoonMessage,
} from '../src/components/comingSoonMessage';
import { askForConfirmation } from '../src/components/ConfirmStation';
import { confirmDestructive } from '../src/components/confirmDestructive';
import { confirmDestructiveMessage } from '../src/components/confirmDestructiveMessage';

jest.mock('../src/components/ConfirmStation', () => ({
  askForConfirmation: jest.fn(() => true),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  (Alert.alert as jest.Mock).mockClear();
  (askForConfirmation as jest.Mock).mockClear();
});

describe('comingSoonMessage — the wording both forks share', () => {
  it('names the affordance in the title and marks it coming soon', () => {
    expect(comingSoonMessage('chat').title).toBe('Trip chat — coming soon');
  });

  it('explains that the part is still being built', () => {
    expect(comingSoonMessage('chat').body).toMatch(/still being built/);
  });

  it('names whatever affordance it is given', () => {
    expect(comingSoonMessage('chat').title).toBe('Trip chat — coming soon');
  });

  it('covers every greyed affordance S4.9, S4.1, S4.13, S4.15, S4.17, S4.20, S3.4, S4.21, S4.22 and S2.1 ship', () => {
    expect(Object.keys(COMING_SOON_SURFACES).sort()).toEqual(
      [
        'booking',
        'chat',
        'comments',
        'diary',
        'follow',
        'notifications',
        'profile',
        'rating',
        'report',
        'reviews',
        'saved',
        'search',
        'share',
        'tripSearch',
      ].sort(),
    );
  });

  it('no longer greys polls — S2.1 built the board, so the refusal retires with the stub', () => {
    expect(Object.keys(COMING_SOON_SURFACES)).not.toContain('polls');
  });

  it('no longer greys Home — S4.22 made it the feed and the landing route', () => {
    expect(Object.keys(COMING_SOON_SURFACES)).not.toContain('home');
  });

  it('no longer greys forking — S4.7 built it, so the refusal retires with the stub', () => {
    expect(Object.keys(COMING_SOON_SURFACES)).not.toContain('fork');
  });
});

describe('comingSoon (native fork)', () => {
  it('shows an alert carrying the shared title and body', () => {
    comingSoon('chat');

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Trip chat — coming soon');
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

  it('asks before acting, and runs the action only when the dialog confirms', () => {
    const onConfirm = jest.fn();
    confirmDestructive('Day 2', onConfirm);

    expect(askForConfirmation).toHaveBeenCalledTimes(1);
    const [wording, confirmed] = (askForConfirmation as jest.Mock).mock.calls[0] as [
      { title: string },
      () => void,
    ];
    expect(wording.title).toBe('Delete Day 2?');
    expect(onConfirm).not.toHaveBeenCalled();

    confirmed();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
