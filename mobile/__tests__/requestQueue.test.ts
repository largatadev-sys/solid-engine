import {
  emptyRequestQueue,
  shownRows,
  withDecision,
  withoutDecision,
} from '../src/profile/requestQueue';

const ROWS = [
  { traveler: { id: 'a' } },
  { traveler: { id: 'b' } },
  { traveler: { id: 'c' } },
];


describe('Approve and Decline take the row away at once (S4.40 decision 9, C2)', () => {
  it('shows every row while nothing has been decided', () => {
    expect(shownRows(ROWS, emptyRequestQueue())).toEqual(ROWS);
  });

  it('drops an approved row from the list immediately', () => {
    const queue = withDecision(emptyRequestQueue(), 'b', 'approve');

    expect(shownRows(ROWS, queue).map((row) => row.traveler.id)).toEqual(['a', 'c']);
  });

  it('drops a declined row on exactly the same terms — neither waits for the server', () => {
    const queue = withDecision(emptyRequestQueue(), 'b', 'decline');

    expect(shownRows(ROWS, queue).map((row) => row.traveler.id)).toEqual(['a', 'c']);
  });

  it('holds several at once, so a fast traveler is never blocked by the first', () => {
    const queue = withDecision(withDecision(emptyRequestQueue(), 'a', 'approve'), 'c', 'decline');

    expect(shownRows(ROWS, queue).map((row) => row.traveler.id)).toEqual(['b']);
  });

  it('ignores a second verdict on a row already decided, so a double tap decides once', () => {
    const once = withDecision(emptyRequestQueue(), 'a', 'approve');
    const twice = withDecision(once, 'a', 'decline');

    expect(twice).toBe(once);
    expect(twice.decided).toEqual([{ travelerId: 'a', verdict: 'approve' }]);
  });

  it('puts a refused row back where it was, in the server order', () => {
    const queue = withoutDecision(withDecision(emptyRequestQueue(), 'b', 'approve'), 'b');

    expect(shownRows(ROWS, queue).map((row) => row.traveler.id)).toEqual(['a', 'b', 'c']);
  });

  it('restores only the row named, leaving the others gone', () => {
    const both = withDecision(withDecision(emptyRequestQueue(), 'a', 'approve'), 'b', 'decline');

    expect(shownRows(ROWS, withoutDecision(both, 'a')).map((row) => row.traveler.id)).toEqual(['a', 'c']);
  });

  it('reaches an empty list when the last one is decided, which is where the empty state goes', () => {
    const all = ROWS.reduce((queue, row) => withDecision(queue, row.traveler.id, 'approve'), emptyRequestQueue());

    expect(shownRows(ROWS, all)).toEqual([]);
  });
});
