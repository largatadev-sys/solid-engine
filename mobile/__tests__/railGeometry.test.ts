import { railCardWidth, railPageCount, railPitch } from '../src/discovery/railGeometry';


describe('the rail measures its own card rather than assuming one', () => {
  it('leaves the gutter and a peek of the next card, which is what advertises the swipe', () => {
    expect(railCardWidth(393, 20, 24)).toBe(349);
  });

  it('reports nothing before layout has happened, so no card is drawn at a guessed size', () => {
    expect(railCardWidth(0, 20, 24)).toBe(0);
    expect(railCardWidth(-5, 20, 24)).toBe(0);
  });

  it('never returns a negative width on a frame narrower than its own insets', () => {
    expect(railCardWidth(30, 20, 24)).toBe(0);
  });
});


describe('the snap pitch is the card plus the gap, never the card alone', () => {
  it('adds the gap, because a pitch of the bare width drifts further every page (S4.17)', () => {
    expect(railPitch(310, 12)).toBe(322);
  });

  it('stays zero while the width is unknown, so snapping is simply off', () => {
    expect(railPitch(0, 12)).toBe(0);
  });
});


describe('the page count includes the end card the traveler can actually reach', () => {
  it('counts the See all card as a page, so the last dot is not unreachable', () => {
    expect(railPageCount(8, true)).toBe(9);
  });

  it('counts only the cards when there is no end card', () => {
    expect(railPageCount(8, false)).toBe(8);
    expect(railPageCount(0, false)).toBe(0);
  });
});
