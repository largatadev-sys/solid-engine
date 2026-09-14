import { readFileSync } from 'fs';
import { join } from 'path';


const queries = readFileSync(join(__dirname, '..', 'src', 'query', 'invitationQueries.ts'), 'utf8');

const card = readFileSync(join(__dirname, '..', 'src', 'components', 'RequestsList.tsx'), 'utf8');


describe('accepting navigates before the cache takes the card away', () => {
  it('invalidates on onSettled, not onSuccess — react-query runs the HOOK callback first', () => {
    const accept = queries.slice(queries.indexOf('export function useAcceptInvitation'));
    const body = accept.slice(0, accept.indexOf('\n}'));

    expect(body).toContain('onSettled: () => onInvitationAccepted(client)');
    expect(body).not.toContain('onSuccess: () => onInvitationAccepted(client)');
  });

  it('and the caller still navigates from its own onSuccess, which is what must win the race', () => {
    expect(card).toContain('onSuccess: (result) => {');
    expect(card).toContain('router.push(`/itineraries/${result.itineraryId}`)');
  });

  it('the race is real: Requests swaps the list for an empty state when the inbox empties', () => {
    const screen = readFileSync(
      join(__dirname, '..', 'app', '(tabs)', '(trips)', 'requests.tsx'),
      'utf8',
    );

    expect(screen).toContain('const empty = invitations.length === 0 && requests.length === 0');
    expect(screen).toContain('{empty ? (');
  });
});
