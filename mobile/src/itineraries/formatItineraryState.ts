
export function formatItineraryState(state: string): string {
  switch (state) {
    case 'draft':
      return 'Draft';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    default:
      return state.charAt(0).toUpperCase() + state.slice(1);
  }
}
