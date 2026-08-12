import { profileMetaLine } from '../src/profile/profileMetaLine';


describe('profileMetaLine — the mock\'s "@handle · #number" line, with either half absent', () => {
  it('joins the handle and the vanity number the way the mock draws them', () => {
    expect(profileMetaLine('jebguardiario', '1')).toBe('@jebguardiario · #1');
  });

  it('renders the handle alone when the traveler has no vanity number yet', () => {
    expect(profileMetaLine('jebguardiario', null)).toBe('@jebguardiario');
  });

  it('renders the number alone when the traveler has no handle yet', () => {
    expect(profileMetaLine(null, '1')).toBe('#1');
  });

  it('renders nothing at all when the traveler has neither, so the line is omitted', () => {
    expect(profileMetaLine(null, null)).toBeNull();
  });

  it('prefixes the served number verbatim, parsing nothing (S4.14)', () => {
    expect(profileMetaLine(null, '010042')).toBe('#010042');
    expect(profileMetaLine(null, 'LGT-7')).toBe('#LGT-7');
  });
});
