import { dragToScroll, SNAP_STYLE } from '../src/components/stripScroll.web';
import { freeScroll } from '../src/components/stripSettle';


function strip(width = 300, at = 0) {
  return {
    scrollLeft: at,
    clientWidth: width,
    style: { scrollBehavior: 'auto', scrollSnapType: SNAP_STYLE.scrollSnapType },
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
  };
}

const press = (target: unknown, pointerType: string, clientX: number) =>
  ({ target, currentTarget: target, pointerType, pointerId: 1, button: 0, clientX,
     preventDefault: () => undefined }) as never;


describe('the web drag claims the MOUSE only — touch belongs to the browser (founder, 08/12)', () => {
  it('scrolls the strip for a mouse, which cannot scroll an overflow div by itself', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'mouse', 200));
    drag.onPointerMove(press(el, 'mouse', 120));

    expect(el.scrollLeft).toBe(80);
  });

  it('leaves a TOUCH gesture entirely alone — the browser already scrolls it', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'touch', 200));
    drag.onPointerMove(press(el, 'touch', 120));

    expect(el.scrollLeft).toBe(0);
  });

  it('leaves a PEN gesture alone too — anything the browser scrolls natively', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'pen', 200));
    drag.onPointerMove(press(el, 'pen', 120));

    expect(el.scrollLeft).toBe(0);
  });

  it('does not settle a touch release, so it cannot fight the browser-s own snap', () => {
    const drag = dragToScroll();
    const el = strip(300, 140);

    drag.onPointerDown(press(el, 'touch', 200));
    drag.onPointerUp(press(el, 'touch', 120));

    expect(el.scrollLeft).toBe(140);
  });

  it('suspends CSS snap for the duration of a mouse drag, so the strip follows the cursor 1:1', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'mouse', 200));

    expect(el.style.scrollSnapType).toBe('none');
  });

  it('restores snap on release, so the browser owns paging again', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'mouse', 400));
    drag.onPointerMove(press(el, 'mouse', 190));
    drag.onPointerUp(press(el, 'mouse', 190));

    expect(el.style.scrollSnapType).toBe(SNAP_STYLE.scrollSnapType);
  });

  it('never disturbs snap for a touch gesture — the browser is already paging it', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'touch', 200));
    drag.onPointerMove(press(el, 'touch', 120));
    drag.onPointerUp(press(el, 'touch', 120));

    expect(el.style.scrollSnapType).toBe(SNAP_STYLE.scrollSnapType);
  });

  it('ignores a touch that arrives mid-mouse-drag, rather than steering by the wrong finger', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'mouse', 200));
    drag.onPointerMove(press(el, 'touch', 20));

    expect(el.scrollLeft).toBe(0);
  });

  it('leaves a stray touch release alone while a mouse drag is still held', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'mouse', 200));
    drag.onPointerMove(press(el, 'mouse', 60));
    drag.onPointerUp(press(el, 'touch', 60));

    expect(el.style.scrollSnapType).toBe('none');
  });

  it('still settles a mouse release onto a whole photo', () => {
    const drag = dragToScroll();
    const el = strip();

    drag.onPointerDown(press(el, 'mouse', 400));
    drag.onPointerMove(press(el, 'mouse', 190));
    drag.onPointerUp(press(el, 'mouse', 190));

    expect(el.scrollLeft).toBe(300);
  });
});


describe('a free-scrolling strip is dragged by the same helper, and must not be paged by it', () => {
  function freeStrip(width = 300, at = 0) {
    return {
      scrollLeft: at,
      clientWidth: width,
      style: { scrollBehavior: '', scrollSnapType: '' },
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    };
  }

  it('scrolls a rail that never had paging, the way it scrolls a pager', () => {
    const drag = dragToScroll(freeScroll);
    const el = freeStrip();

    drag.onPointerDown(press(el, 'mouse', 200));
    drag.onPointerMove(press(el, 'mouse', 120));

    expect(el.scrollLeft).toBe(80);
  });

  it('leaves the rail where the traveler let go rather than flying to a page boundary', () => {
    const drag = dragToScroll(freeScroll);
    const el = freeStrip();

    drag.onPointerDown(press(el, 'mouse', 400));
    drag.onPointerMove(press(el, 'mouse', 190));
    drag.onPointerUp(press(el, 'mouse', 190));

    expect(el.scrollLeft).toBe(210);
  });

  it('never IMPOSES mandatory snap on a strip that arrived without it', () => {
    const drag = dragToScroll(freeScroll);
    const el = freeStrip();

    drag.onPointerDown(press(el, 'mouse', 400));
    drag.onPointerMove(press(el, 'mouse', 190));
    drag.onPointerUp(press(el, 'mouse', 190));

    expect(el.style.scrollSnapType).toBe('');
  });

  it('settles a card rail on the pitch it is handed, not on the viewport width', () => {
    const cardPitch = 200;
    const drag = dragToScroll(() => cardPitch);
    const el = freeStrip();

    drag.onPointerDown(press(el, 'mouse', 400));
    drag.onPointerMove(press(el, 'mouse', 130));
    drag.onPointerUp(press(el, 'mouse', 130));

    expect(el.scrollLeft).toBe(200);
  });

  it('reads the pitch at RELEASE, so a rail measured after mount still settles', () => {
    let measured = 0;
    const drag = dragToScroll(() => measured);
    const el = freeStrip();
    measured = 200;

    drag.onPointerDown(press(el, 'mouse', 400));
    drag.onPointerMove(press(el, 'mouse', 130));
    drag.onPointerUp(press(el, 'mouse', 130));

    expect(el.scrollLeft).toBe(200);
  });
});


describe('a drag that moved must not land as a press on whatever it finished over', () => {
  function pressableStrip() {
    const listeners: string[] = [];
    return {
      listeners,
      el: {
        scrollLeft: 0,
        clientWidth: 300,
        style: { scrollBehavior: '', scrollSnapType: '' },
        setPointerCapture: () => undefined,
        releasePointerCapture: () => undefined,
        addEventListener: (type: string) => listeners.push(type),
        removeEventListener: () => undefined,
      },
    };
  }

  it('swallows the click that follows a real drag, so a rail card does not open mid-scroll', () => {
    const { listeners, el } = pressableStrip();
    const drag = dragToScroll(freeScroll);

    drag.onPointerDown(press(el, 'mouse', 400));
    drag.onPointerMove(press(el, 'mouse', 190));
    drag.onPointerUp(press(el, 'mouse', 190));

    expect(listeners).toContain('click');
  });

  it('lets a plain click through untouched — a tab that is tapped must still select', () => {
    const { listeners, el } = pressableStrip();
    const drag = dragToScroll(freeScroll);

    drag.onPointerDown(press(el, 'mouse', 200));
    drag.onPointerUp(press(el, 'mouse', 200));

    expect(listeners).toEqual([]);
  });

  it('lets a hand tremor through as a click rather than eating it as a drag', () => {
    const { listeners, el } = pressableStrip();
    const drag = dragToScroll(freeScroll);

    drag.onPointerDown(press(el, 'mouse', 200));
    drag.onPointerMove(press(el, 'mouse', 198));
    drag.onPointerUp(press(el, 'mouse', 198));

    expect(listeners).toEqual([]);
  });
});
