import {
  carouselCounter,
  carouselPhotoWidth,
  dayTimeBadge,
  likesLabel,
  pageOfOffset,
  previewCount,
  showsCarouselChrome,
} from '../src/diary/postcardCarousel';
import { snapshotEyebrow } from '../src/diary/postcardAnatomy';


const WIDTH = 300;


describe('pageOfOffset — which photo the carousel has settled on', () => {
  it('is the first photo before the traveler has scrolled', () => {
    expect(pageOfOffset(0, WIDTH, 5)).toBe(0);
  });

  it('turns the page once the scroll passes half a photo, not before', () => {
    expect(pageOfOffset(149, WIDTH, 5)).toBe(0);
    expect(pageOfOffset(150, WIDTH, 5)).toBe(1);
  });

  it('counts further pages by whole photos', () => {
    expect(pageOfOffset(600, WIDTH, 5)).toBe(2);
    expect(pageOfOffset(900, WIDTH, 5)).toBe(3);
  });

  it('clamps at both ends rather than reporting a photo that is not there', () => {
    expect(pageOfOffset(-400, WIDTH, 5)).toBe(0);
    expect(pageOfOffset(9000, WIDTH, 5)).toBe(4);
  });

  it('refuses to divide by a width it has not measured yet', () => {
    expect(pageOfOffset(600, 0, 5)).toBe(0);
  });

  it('stays on the only page there is when a postcard holds one photo', () => {
    expect(pageOfOffset(900, WIDTH, 1)).toBe(0);
  });
});


describe('carouselPhotoWidth — one photo owns the viewport, scrolled rather than peeked', () => {
  it('gives the active photo the whole stage, however many follow it (founder, 08/12)', () => {
    expect(carouselPhotoWidth(360, 5)).toBe(360);
  });

  it('gives a single-photo postcard the whole stage too', () => {
    expect(carouselPhotoWidth(360, 1)).toBe(360);
  });

  it('has no width to divide before the stage has been measured', () => {
    expect(carouselPhotoWidth(0, 5)).toBe(0);
  });

  it('refuses to go negative on a stage narrower than the peek itself', () => {
    expect(carouselPhotoWidth(20, 5)).toBe(20);
  });
});


describe('the carousel chrome the mock draws only when there is more than one photo', () => {
  it('shows the counter and dots for a postcard with several photos', () => {
    expect(showsCarouselChrome(5)).toBe(true);
    expect(showsCarouselChrome(2)).toBe(true);
  });

  it('shows neither for a single-photo postcard, exactly as the mock draws it', () => {
    expect(showsCarouselChrome(1)).toBe(false);
    expect(showsCarouselChrome(0)).toBe(false);
  });

  it('counts from one for the traveler, not from zero', () => {
    expect(carouselCounter(0, 5)).toBe('1/5');
    expect(carouselCounter(4, 5)).toBe('5/5');
  });
});


describe('dayTimeBadge — the mock joins with a middle dot, the diary stream with a bullet', () => {
  it('joins the day and the time the way the badge draws them', () => {
    expect(dayTimeBadge({ dayLabel: 'Day 1', timeOfDay: '18:12' })).toBe('Day 1 · 6:12 PM');
  });

  it('drops the leading zero from a morning hour', () => {
    expect(dayTimeBadge({ dayLabel: 'Day 2', timeOfDay: '06:30' })).toBe('Day 2 · 6:30 AM');
  });

  it('renders the day alone when the entry carries no time', () => {
    expect(dayTimeBadge({ dayLabel: 'Day 3', timeOfDay: null })).toBe('Day 3');
  });
});


describe('previewCount — the mock writes the count in words on the right, not in a pill', () => {
  it('counts from one for the traveler', () => {
    expect(previewCount(0, 3)).toBe('1 of 3');
    expect(previewCount(2, 3)).toBe('3 of 3');
  });

  it('says nothing at all for a single-photo entry — there is nothing to count through', () => {
    expect(previewCount(0, 1)).toBeNull();
  });
});


describe('the two eyebrows differ by their separator, deliberately — both are mocked', () => {
  it('joins with a bullet on the stream and a middle dot on the profile', () => {
    const entry = { dayLabel: 'Day 2', timeOfDay: '16:30' };

    expect(snapshotEyebrow(entry)).toBe('Day 2 • 4:30 PM');
    expect(dayTimeBadge(entry)).toBe('Day 2 · 4:30 PM');
  });
});


describe('likesLabel — the stub row, singular and plural', () => {
  it('counts likes the way the mock writes them', () => {
    expect(likesLabel(14)).toBe('14 likes');
  });

  it('says one like rather than 1 likes', () => {
    expect(likesLabel(1)).toBe('1 like');
  });
});
