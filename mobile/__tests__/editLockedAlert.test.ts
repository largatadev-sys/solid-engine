import { Alert } from 'react-native';
import { ApiError } from '../src/api/ApiError';
import { editLockedAlert } from '../src/components/editLockedAlert';
import { editLockedMessage } from '../src/components/editLockedMessage';



jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  (Alert.alert as jest.Mock).mockClear();
});

const locked = (message: string) =>
  new ApiError({ code: 'EDIT_LOCKED', message, status: 409 });

describe('editLockedMessage — the wording both forks share', () => {
  it("shows the backend's holder-naming message verbatim when locked by another member", () => {
    const { title, body } = editLockedMessage(locked('Maria is editing this itinerary right now.'));

    expect(title).toBe('Someone is editing');
    expect(body).toBe('Maria is editing this itinerary right now.');
  });

  it('shows an offline message when the acquire failed at the network, not the lock', () => {
    const { title, body } = editLockedMessage(ApiError.offline());

    expect(title).toBe("You're offline");
    expect(body).toMatch(/connection to edit/i);
  });

  it('falls back to a neutral message for any other error, never leaking it raw', () => {
    const { body } = editLockedMessage(new Error('kaboom'));

    expect(body).toMatch(/Another member is editing/i);
    expect(body).not.toMatch(/kaboom/);
  });
});

describe('editLockedAlert (native fork)', () => {
  it('shows the holder-naming message as a native dialog', () => {
    editLockedAlert(locked('Maria is editing this itinerary right now.'));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Someone is editing');
    expect(body).toBe('Maria is editing this itinerary right now.');
  });

  it('shows the offline message when offline', () => {
    editLockedAlert(ApiError.offline());

    const [title] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe("You're offline");
  });
});
