import {
  archiveTripWording,
  unarchiveTripWording,
} from '../src/components/confirmDestructiveMessage';

describe('archive confirm copy states the audience consequence (S4.1 decision 12)', () => {
  it('says the trip disappears for everyone else, not just that it is read-only', () => {
    const { body } = archiveTripWording(false);

    expect(body).toMatch(/disappears for everyone else/);
    expect(body).toMatch(/lose the trip from their list/);
  });

  it('names the published page only when there is one to take down', () => {
    expect(archiveTripWording(true).body).toMatch(/published page goes down/);
    expect(archiveTripWording(false).body).not.toMatch(/published page/);
  });

  it('promises the restore on unarchive, published page included', () => {
    expect(unarchiveTripWording(true).body).toMatch(/Everyone on the trip gets it back/);
    expect(unarchiveTripWording(true).body).toMatch(/published page goes back up/);
    expect(unarchiveTripWording(false).body).not.toMatch(/published page/);
  });

  it('keeps the honest carve-out: invites and offers are not restored', () => {
    expect(unarchiveTripWording(false).body).toMatch(/not restored/);
  });
});
