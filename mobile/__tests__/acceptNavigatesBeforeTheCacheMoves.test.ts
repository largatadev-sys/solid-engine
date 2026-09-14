import { readFileSync } from 'fs';
import { join } from 'path';


const queries = readFileSync(join(__dirname, '..', 'src', 'query', 'invitationQueries.ts'), 'utf8');

const card = readFileSync(join(__dirname, '..', 'src', 'components', 'RequestsList.tsx'), 'utf8');

const core = readFileSync(
  join(__dirname, '..', 'node_modules', '@tanstack', 'query-core', 'build', 'modern', 'mutation.js'),
  'utf8',
);


describe('accepting navigates before the cache takes the card away', () => {
  it('the library awaits the HOOK callbacks before it dispatches success to the caller — so a hook that awaits a refetch delays the navigation', () => {
    const successDispatch = core.indexOf('type: "success"');
    const hookOnSuccess = core.indexOf('await this.options.onSuccess?.(');
    const hookOnSettled = core.indexOf('await this.options.onSettled?.(');

    expect(hookOnSuccess).toBeGreaterThan(-1);
    expect(hookOnSettled).toBeGreaterThan(-1);
    expect(hookOnSuccess).toBeLessThan(successDispatch);
    expect(hookOnSettled).toBeLessThan(successDispatch);
  });

  it('the hook does NOT await the invalidation — onSettled would have been a no-op, since the library awaits that too', () => {
    const accept = queries.slice(queries.indexOf('export function useAcceptInvitation'));
    const body = accept.slice(0, accept.indexOf('\n}'));

    expect(body).toContain('void onInvitationAccepted(client)');
    expect(body).not.toMatch(/onSuccess:\s*\(\)\s*=>\s*onInvitationAccepted\(client\)/);
    expect(body).not.toMatch(/onSettled:\s*\(\)\s*=>\s*onInvitationAccepted\(client\)/);
  });

  it('the caller navigates FIRST inside its own onSuccess, and only then touches layout', () => {
    const handler = card.slice(card.indexOf('onSuccess: (result) => {'));
    const body = handler.slice(0, handler.indexOf('},'));
    const push = body.indexOf('router.push(`/itineraries/${result.itineraryId}`)');
    const layout = body.indexOf('closeLayout()');

    expect(push).toBeGreaterThan(-1);
    expect(layout).toBeGreaterThan(-1);
    expect(push).toBeLessThan(layout);
  });

  it('the race is real: the caller callback only fires while the observer has listeners, and Requests swaps the list for an empty state when the inbox empties', () => {
    const observer = readFileSync(
      join(__dirname, '..', 'node_modules', '@tanstack', 'query-core', 'build', 'modern', 'mutationObserver.js'),
      'utf8',
    );
    const screen = readFileSync(
      join(__dirname, '..', 'app', '(tabs)', '(trips)', 'requests.tsx'),
      'utf8',
    );

    expect(observer).toContain('if (this.#mutateOptions && this.hasListeners())');
    expect(screen).toContain('const empty = invitations.length === 0 && requests.length === 0');
    expect(screen).toContain('{empty ? (');
  });
});
