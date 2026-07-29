import { Alert } from 'react-native';
import { comingSoon } from '../src/components/comingSoon';
import { comingSoonMessage } from '../src/components/comingSoonMessage';
import { confirmDestructive } from '../src/components/confirmDestructive';
import { confirmDestructiveMessage } from '../src/components/confirmDestructiveMessage';



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
