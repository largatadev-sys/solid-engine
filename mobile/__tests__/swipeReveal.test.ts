import {
  ENGAGE_PX,
  OPEN_X,
  OVERDRAG_PX,
  REVEAL_PX,
  engages,
  landsOpen,
  restingX,
  trackedX,
} from '../src/removal/swipeReveal';


describe('the track clamps between shut and a little past the panel', () => {
  it('sits at zero when the finger has not moved', () => {
    expect(trackedX(0, 0)).toBe(0);
  });

  it('follows the finger leftwards', () => {
    expect(trackedX(0, -40)).toBe(-40);
  });

  it('never travels right of shut, however far the finger drags that way', () => {
    expect(trackedX(0, 200)).toBe(0);
    expect(trackedX(OPEN_X, 500)).toBe(0);
  });

  it('allows exactly the handoff overdrag past the panel and no further', () => {
    expect(trackedX(0, -1000)).toBe(-(REVEAL_PX + OVERDRAG_PX));
    expect(REVEAL_PX + OVERDRAG_PX).toBe(108);
  });

  it('drags onward from a card already open, rather than jumping', () => {
    expect(trackedX(OPEN_X, -10)).toBe(OPEN_X - 10);
  });

  it('closes a card that is open when the finger drags right', () => {
    expect(trackedX(OPEN_X, 96)).toBe(0);
  });
});


describe('a small movement is a tap, not a drag', () => {
  it('does not engage below the threshold, so taps still land', () => {
    expect(engages(0, 0)).toBe(false);
    expect(engages(-3, 0)).toBe(false);
  });

  it('engages at the threshold', () => {
    expect(engages(-ENGAGE_PX, 0)).toBe(true);
  });

  it('engages on a rightward drag too, so an open card can be shut', () => {
    expect(engages(ENGAGE_PX, 0)).toBe(true);
  });

  it('does not engage when the finger is mostly travelling vertically — that is a scroll', () => {
    expect(engages(-6, 40)).toBe(false);
  });
});


describe('release snaps by which half the card is in', () => {
  it('springs back when the card has not passed half the panel', () => {
    expect(landsOpen(-47)).toBe(false);
    expect(restingX(-47)).toBe(0);
  });

  it('snaps open past half', () => {
    expect(landsOpen(-49)).toBe(true);
    expect(restingX(-49)).toBe(OPEN_X);
  });

  it('rests exactly at the panel width when open, never at the overdrag', () => {
    expect(restingX(-(REVEAL_PX + OVERDRAG_PX))).toBe(OPEN_X);
    expect(OPEN_X).toBe(-REVEAL_PX);
  });

  it('springs back from a shut card', () => {
    expect(restingX(0)).toBe(0);
  });
});
