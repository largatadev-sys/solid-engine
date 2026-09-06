import {
  exited,
  isEmptied,
  readyToExit,
  reverted,
  settled,
  visible,
} from '../src/diary/optimisticExit';


type Row = { readonly id: string };

const idOf = (row: Row) => row.id;

const three = readyToExit<Row>([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 3);


describe('the optimistic exit', () => {

  it('takes the row off screen and decrements the stat the instant Delete is tapped', () => {
    const after = exited(three, 'b', true);

    expect(visible(after, idOf).map(idOf)).toEqual(['a', 'c']);
    expect(after.count).toBe(2);
  });


  it('leaves the stat alone for a row that does not count toward it', () => {
    const after = exited(three, 'b', false);

    expect(visible(after, idOf).map(idOf)).toEqual(['a', 'c']);
    expect(after.count).toBe(3);
  });


  it('brings the row back in place and restores the stat when the request fails', () => {
    const after = reverted(exited(three, 'b', true), 'b', true);

    expect(visible(after, idOf).map(idOf))
      .toEqual(['a', 'b', 'c']);
    expect(after.count).toBe(3);
  });


  it('restores nothing when the exit never decremented', () => {
    const after = reverted(exited(three, 'b', false), 'b', false);

    expect(after.count).toBe(3);
  });


  it('drops the row for good once the request succeeds', () => {
    const after = settled(exited(three, 'b', true), 'b', idOf);

    expect(after.rows.map(idOf)).toEqual(['a', 'c']);
    expect(after.exiting).toEqual([]);
    expect(after.count).toBe(2);
  });


  it('ignores a second exit of the same row, so a double tap cannot double-decrement', () => {
    const once = exited(three, 'b', true);
    const twice = exited(once, 'b', true);

    expect(twice).toBe(once);
    expect(twice.count).toBe(2);
  });


  it('ignores a revert of a row that never left', () => {
    expect(reverted(three, 'b', true)).toBe(three);
  });


  it('knows when the last row has gone, which is what shows the empty state', () => {
    const emptied = ['a', 'b', 'c'].reduce(
      (state, id) => exited(state, id, true),
      readyToExit<Row>([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 3),
    );

    expect(isEmptied(three, idOf)).toBe(false);
    expect(isEmptied(emptied, idOf)).toBe(true);
    expect(emptied.count).toBe(0);
  });


  it('never lets the stat fall below zero', () => {
    const overshot = exited(readyToExit<Row>([{ id: 'a' }], 0), 'a', true);

    expect(overshot.count).toBe(0);
  });
});
