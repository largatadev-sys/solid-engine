import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WEB_FORK = join(__dirname, '..', 'src', 'feedback', 'useDockDrag.web.ts');

describe('the web dock drag tracks the pointer', () => {
  const source = readFileSync(WEB_FORK, 'utf8');

  it('subscribes to pointermove, so the bubble follows the finger', () => {
    expect(source).toMatch(/addEventListener\(\s*'pointermove'/);
  });

  it('unsubscribes from pointermove, so a finished drag leaves no listener behind', () => {
    expect(source).toMatch(/removeEventListener\(\s*'pointermove'/);
  });

  it('listens on window rather than through an RN-web prop (the S4.38 seam)', () => {
    expect(source).toMatch(/window\.addEventListener\(\s*'pointermove'/);
    expect(source).not.toMatch(/onPointerMove:/);
  });

  it('reports that it tracks, so the dock never claims a degraded lane it is not in', () => {
    expect(source).toMatch(/tracksPointer:\s*true/);
  });
});

describe('the dock keeps every disc-transform value off the native driver', () => {
  const dock = readFileSync(join(__dirname, '..', 'src', 'feedback', 'FeedbackDock.tsx'), 'utf8');

  const TRANSFORM_VALUES = ['offset', 'lift', 'pressed', 'entrance'] as const;

  it.each(TRANSFORM_VALUES)(
    'never animates %s with useNativeDriver: true — it is written by imperative setValue',
    (value) => {
      const blocks = dock.match(
        new RegExp(String.raw`Animated\.(spring|timing)\(${value},[\s\S]*?\}\)`, 'g'),
      ) ?? [];

      blocks.forEach((block) => expect(block).not.toMatch(/useNativeDriver:\s*true/));
    },
  );

  it('drives the shared glide helper off the native driver too', () => {
    const helper = dock.match(/function glide\([\s\S]*?\n\}/)?.[0];

    expect(helper).toBeDefined();
    expect(helper).not.toMatch(/useNativeDriver:\s*true/);
  });

  it('finds animations to check, so the rule cannot pass vacuously', () => {
    const animated = dock.match(/Animated\.(spring|timing)\(/g) ?? [];
    const glided = dock.match(/\bglide\(/g) ?? [];

    expect(animated.length + glided.length).toBeGreaterThan(5);
  });
});
