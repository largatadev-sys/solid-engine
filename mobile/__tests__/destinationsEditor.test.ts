import {
  addDestination,
  cleanDestinations,
  removeDestination,
  setDestination,
} from '../src/itineraries/destinationsEditor';



describe('destinationsEditor', () => {
  it('adds an empty row to the end', () => {
    expect(addDestination(['Palawan'])).toEqual(['Palawan', '']);
  });

  it('removes the row at an index', () => {
    expect(removeDestination(['Palawan', 'El Nido', 'Coron'], 1)).toEqual(['Palawan', 'Coron']);
  });

  it('sets the row at an index', () => {
    expect(setDestination(['Palawan', ''], 1, 'El Nido')).toEqual(['Palawan', 'El Nido']);
  });

  it('cleans on submit: trims every row and drops the blanks', () => {
    expect(cleanDestinations(['  Palawan ', '', '  ', 'El Nido'])).toEqual(['Palawan', 'El Nido']);
  });

  it('cleaning an all-blank list yields an empty list (the backend then rejects min-one)', () => {
    expect(cleanDestinations(['', '  '])).toEqual([]);
  });

  it('round-trips add → edit → clean the way the screen uses them', () => {
    let rows = ['Palawan'];
    rows = addDestination(rows);
    rows = setDestination(rows, 1, 'El Nido');
    expect(cleanDestinations(rows)).toEqual(['Palawan', 'El Nido']);
  });

  it('never mutates the input array', () => {
    const input = ['Palawan', 'El Nido'];
    addDestination(input);
    removeDestination(input, 0);
    setDestination(input, 0, 'x');
    cleanDestinations(input);
    expect(input).toEqual(['Palawan', 'El Nido']);
  });
});
