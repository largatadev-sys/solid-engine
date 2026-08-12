import {
  counterLabel,
  dotScale,
  dotWindow,
  landingPage,
  loadsPage,
  MAX_DOTS,
  pageOfOffset,
  showsCarousel,
} from '../src/feed/feedCarousel';

const WIDTH = 359;


describe('pageOfOffset — which photo the strip has settled on', () => {
  it('turns the page once the scroll passes half a photo, not before', () => {
    expect(pageOfOffset(WIDTH / 2 - 1, WIDTH, 5)).toBe(0);
    expect(pageOfOffset(WIDTH / 2, WIDTH, 5)).toBe(1);
  });

  it('clamps at both ends rather than naming a photo that is not there', () => {
    expect(pageOfOffset(-500, WIDTH, 3)).toBe(0);
    expect(pageOfOffset(WIDTH * 99, WIDTH, 3)).toBe(2);
  });

  it('refuses to divide by a width it has not measured yet', () => {
    expect(pageOfOffset(600, 0, 5)).toBe(0);
  });
});


describe('landingPage — both directions need the same travel', () => {
  it('lands one page along for a full page of travel, either way', () => {
    expect(landingPage(2, WIDTH, WIDTH, 5)).toBe(3);
    expect(landingPage(2, -WIDTH, WIDTH, 5)).toBe(1);
  });

  it('needs exactly as much travel to go back as to go forward — Math.round(-0.5) is -0', () => {
    const halfBack = landingPage(2, -WIDTH / 2, WIDTH, 5);
    const halfForward = landingPage(2, WIDTH / 2, WIDTH, 5);

    expect(halfForward).toBe(3);
    expect(halfBack).toBe(1);
  });

  it('stays put for a flick shorter than half a page, in both directions', () => {
    expect(landingPage(2, WIDTH * 0.4, WIDTH, 5)).toBe(2);
    expect(landingPage(2, -WIDTH * 0.4, WIDTH, 5)).toBe(2);
  });

  it('never wraps — the ends rubber-band instead', () => {
    expect(landingPage(0, -WIDTH * 3, WIDTH, 5)).toBe(0);
    expect(landingPage(4, WIDTH * 3, WIDTH, 5)).toBe(4);
  });
});


describe('dotWindow — at most five dots, sliding past that', () => {
  it('shows one dot per photo while they fit', () => {
    expect(dotWindow(0, 3)).toEqual([0, 1, 2]);
    expect(dotWindow(4, MAX_DOTS)).toEqual([0, 1, 2, 3, 4]);
  });

  it('slides rather than growing once there are more photos than dots', () => {
    expect(dotWindow(0, 9)).toEqual([0, 1, 2, 3, 4]);
    expect(dotWindow(4, 9)).toEqual([2, 3, 4, 5, 6]);
    expect(dotWindow(8, 9)).toEqual([4, 5, 6, 7, 8]);
  });

  it('pins the window at each end rather than running off it', () => {
    expect(dotWindow(1, 9)).toEqual([0, 1, 2, 3, 4]);
    expect(dotWindow(7, 9)).toEqual([4, 5, 6, 7, 8]);
  });

  it('keeps the active page inside the window at every position', () => {
    for (let page = 0; page < 12; page += 1) {
      expect(dotWindow(page, 12)).toContain(page);
    }
  });

  it('draws nothing for an empty card', () => {
    expect(dotWindow(0, 0)).toEqual([]);
  });
});


describe('dotScale — the edge dots shrink to say "there is more this way"', () => {
  it('draws the active dot full size', () => {
    expect(dotScale(2, 2, dotWindow(2, 9), 9)).toBe(1);
  });

  it('leaves every dot the same size while they all fit', () => {
    const window = dotWindow(1, 4);
    expect(dotScale(0, 1, window, 4)).toBe(dotScale(3, 1, window, 4));
  });

  it('shrinks an edge dot only when photos continue past it', () => {
    const middle = dotWindow(4, 9);
    expect(dotScale(2, 4, middle, 9)).toBeLessThan(dotScale(3, 4, middle, 9));
    expect(dotScale(6, 4, middle, 9)).toBeLessThan(dotScale(5, 4, middle, 9));
  });

  it('leaves the first dot full-height when the window is already at the start', () => {
    const atStart = dotWindow(0, 9);
    expect(dotScale(0, 1, atStart, 9)).toBeGreaterThan(dotScale(4, 1, atStart, 9));
  });
});


describe('the chrome only appears where it means something', () => {
  it('shows no carousel furniture for a single photo', () => {
    expect(showsCarousel(1)).toBe(false);
    expect(showsCarousel(2)).toBe(true);
  });

  it('counts from one, the way a reader does', () => {
    expect(counterLabel(0, 3)).toBe('1/3');
    expect(counterLabel(2, 3)).toBe('3/3');
  });
});


describe('loadsPage — current and neighbours only', () => {
  it('loads the page either side and nothing further', () => {
    expect([0, 1, 2, 3, 4].filter((page) => loadsPage(page, 2))).toEqual([1, 2, 3]);
  });

  it('still loads a neighbour at the ends', () => {
    expect([0, 1, 2].filter((page) => loadsPage(page, 0))).toEqual([0, 1]);
  });
});
