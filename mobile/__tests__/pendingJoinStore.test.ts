import {
  forgetPendingJoin,
  pendingJoinToken,
  resetPendingJoinForTests,
  restorePendingJoin,
  stashPendingJoin,
  subscribeToPendingJoin,
} from '../src/join/pendingJoinStore';
import {
  clearPendingJoin,
  loadPendingJoin,
  savePendingJoin,
} from '../src/join/pendingJoinStorage';

jest.mock('../src/join/pendingJoinStorage', () => ({
  loadPendingJoin: jest.fn(async () => null),
  savePendingJoin: jest.fn(async () => undefined),
  clearPendingJoin: jest.fn(async () => undefined),
}));

const load = loadPendingJoin as jest.Mock;
const save = savePendingJoin as jest.Mock;
const clear = clearPendingJoin as jest.Mock;

const TOKEN = ['join', 'link', 'sample', '1234567890', 'abcdefghij'].join('_');

beforeEach(() => {
  resetPendingJoinForTests();
  load.mockReset().mockResolvedValue(null);
  save.mockReset().mockResolvedValue(undefined);
  clear.mockReset().mockResolvedValue(undefined);
});

describe('stashing the token a signed-out visitor arrived with', () => {
  it('holds it in memory and writes it through to storage', () => {
    stashPendingJoin(TOKEN);

    expect(pendingJoinToken()).toBe(TOKEN);
    expect(save).toHaveBeenCalledWith(TOKEN);
  });

  it('tells anyone watching, so the gate re-decides where to land', () => {
    const woken = jest.fn();
    subscribeToPendingJoin(woken);

    stashPendingJoin(TOKEN);

    expect(woken).toHaveBeenCalled();
  });

  it('does not thrash on a repeated stash of the same token', () => {
    const woken = jest.fn();
    subscribeToPendingJoin(woken);

    stashPendingJoin(TOKEN);
    stashPendingJoin(TOKEN);

    expect(woken).toHaveBeenCalledTimes(1);
  });
});

describe('surviving the round trip', () => {
  it('reads the token back after a restart, when memory has nothing', async () => {
    load.mockResolvedValue(TOKEN);

    expect(pendingJoinToken()).toBeNull();
    expect(await restorePendingJoin()).toBe(TOKEN);
    expect(pendingJoinToken()).toBe(TOKEN);
  });

  it('wakes the gate when the restore finds one, since the first render saw nothing', async () => {
    load.mockResolvedValue(TOKEN);
    const woken = jest.fn();
    subscribeToPendingJoin(woken);

    await restorePendingJoin();

    expect(woken).toHaveBeenCalled();
  });

  it('touches storage once however many times it is asked', async () => {
    load.mockResolvedValue(TOKEN);

    await restorePendingJoin();
    await restorePendingJoin();
    await restorePendingJoin();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('never overwrites a token stashed this session with a stale stored one', async () => {
    load.mockResolvedValue('an-older-stored-token-1234567890');
    stashPendingJoin(TOKEN);

    expect(await restorePendingJoin()).toBe(TOKEN);
  });

  it('comes back empty when nothing was stored', async () => {
    expect(await restorePendingJoin()).toBeNull();
  });
});

describe('clearing it once the landing has been reached', () => {
  it('drops it from memory and from storage', () => {
    stashPendingJoin(TOKEN);

    forgetPendingJoin();

    expect(pendingJoinToken()).toBeNull();
    expect(clear).toHaveBeenCalled();
  });

  it('wakes the gate so it stops routing to the landing', () => {
    stashPendingJoin(TOKEN);
    const woken = jest.fn();
    subscribeToPendingJoin(woken);

    forgetPendingJoin();

    expect(woken).toHaveBeenCalled();
  });

  it('does nothing when there was nothing to forget', () => {
    forgetPendingJoin();

    expect(clear).not.toHaveBeenCalled();
  });

  it('stays cleared across a later restore — the trip is joined, the token is spent', async () => {
    load.mockResolvedValue(TOKEN);
    stashPendingJoin(TOKEN);
    forgetPendingJoin();

    expect(await restorePendingJoin()).toBeNull();
  });
});

describe('unsubscribing', () => {
  it('stops waking a listener that has gone away', () => {
    const woken = jest.fn();
    const stop = subscribeToPendingJoin(woken);

    stop();
    stashPendingJoin(TOKEN);

    expect(woken).not.toHaveBeenCalled();
  });
});
