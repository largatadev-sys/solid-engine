import { readFileSync } from 'node:fs';
import { join } from 'node:path';


const SOURCE = readFileSync(join(__dirname, '..', 'src', 'components', 'Icon.tsx'), 'utf8');


function declaredNames(): string[] {
  const union = SOURCE.slice(
    SOURCE.indexOf('export type IconName ='),
    SOURCE.indexOf('interface IconProps'),
  );
  return [...union.matchAll(/'([a-zA-Z]+)'/g)].map((match) => match[1] as string);
}


describe('every IconName draws something — an unknown name renders an EMPTY Svg, silently', () => {
  it('has a branch for every name the union declares', () => {
    const undrawn = declaredNames().filter(
      (name) => !SOURCE.includes(`name === '${name}'`),
    );

    expect(undrawn)
      .toEqual([]);
  });

  it('declares a name for every branch the component draws', () => {
    const drawn = [...SOURCE.matchAll(/name === '([a-zA-Z]+)'/g)].map((match) => match[1] as string);
    const names = new Set(declaredNames());

    expect(drawn.filter((name) => !names.has(name))).toEqual([]);
  });

  it('actually scans branches, so an empty undrawn list is not a broken regex', () => {
    expect(declaredNames().length).toBeGreaterThan(40);
  });
});
