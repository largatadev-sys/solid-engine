import { workspaceChipLabel } from '../src/itineraries/WorkspaceChip';


describe('the status chip is the WORKSPACE state, never the itinerary lifecycle (S4.9 decision 7)', () => {
  it('reads Active for a live workspace', () => {
    expect(workspaceChipLabel({ archived: false, workspaceState: 'active' })).toBe('Active');
  });

  it('reads Archived in the same slot, replacing the old badge', () => {
    expect(workspaceChipLabel({ archived: true, workspaceState: 'archived' })).toBe('Archived');
  });

  it('renders NOTHING for a completed workspace — the inert S1.7 mirror, parked until S4.1', () => {
    expect(workspaceChipLabel({ archived: false, workspaceState: 'completed' })).toBeNull();
  });

  it('still says Active against a server that has not learned the field yet', () => {
    expect(workspaceChipLabel({ archived: false, workspaceState: undefined })).toBe('Active');
  });

  it('lets archived win over any state, because an archived trip is read-only whatever else it is', () => {
    expect(workspaceChipLabel({ archived: true, workspaceState: 'completed' })).toBe('Archived');
  });
});
