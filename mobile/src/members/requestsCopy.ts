export const REQUESTS_TITLE = 'Requests';

export const REQUESTS_ICON_LABEL = 'Requests';

export const REQUESTS_EMPTY_TITLE = 'Nothing pending';

export const REQUESTS_EMPTY_BODY =
  'Invitations to join a trip, and the requests you have sent, land here. There is nothing waiting on you right now.';

export const REQUESTS_ERROR_TITLE = 'Could not load your requests';


export function requestsIconLabel(unseen: number): string {
  return unseen === 0 ? REQUESTS_ICON_LABEL : `${REQUESTS_ICON_LABEL}, ${unseen} new`;
}
