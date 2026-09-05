import { rowAffordance } from '../src/profile/followerAffordance';

const OWN = true;
const SOMEONE_ELSE = false;


describe('the kebab appears on one list only (S4.40 decision 10, frame 5a)', () => {
  it('offers it on the viewer own Followers list, where removing is their act', () => {
    expect(rowAffordance('followers', OWN)).toBe('kebab');
  });

  it('offers a plain chevron on the viewer own Following list — leaving is unfollowing', () => {
    expect(rowAffordance('following', OWN)).toBe('chevron');
  });

  it('offers a plain chevron on another traveler lists, either side', () => {
    expect(rowAffordance('followers', SOMEONE_ELSE)).toBe('chevron');
    expect(rowAffordance('following', SOMEONE_ELSE)).toBe('chevron');
  });

  it('leaves exactly one of the four cases carrying a kebab', () => {
    const cases = (['followers', 'following'] as const).flatMap((side) =>
      [OWN, SOMEONE_ELSE].map((isSelf) => rowAffordance(side, isSelf)),
    );

    expect(cases.filter((each) => each === 'kebab')).toHaveLength(1);
  });
});
