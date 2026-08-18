export const TRIP_CREATED_TITLE = 'Trip Created!';

export const OPEN_WORKSPACE_LABEL = 'Open Trip Workspace';

export const PREVIEW_TRIP_LABEL = 'Preview Trip';


export function tripCreatedBody(title: string): string {
  return `"${title}" is saved to your trips. Open the workspace to start building the days.`;
}


export function tripCreatedMeta(trip: { destination: string; days: number }): string {
  const where = trip.destination.trim();
  const howLong = trip.days === 0 ? '' : `${trip.days} ${trip.days === 1 ? 'Day' : 'Days'}`;

  return [where, howLong].filter((part) => part !== '').join(' • ');
}
