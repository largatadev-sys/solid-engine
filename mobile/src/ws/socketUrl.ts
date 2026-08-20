export const UPGRADE_PATH = '/ws';

export function socketUrlFrom(apiBaseUrl: string, ticket: string): string {
  const withoutTrailingSlash = apiBaseUrl.replace(/\/+$/, '');
  const socketOrigin = withoutTrailingSlash.replace(/^http(s?):\/\//, 'ws$1://');
  return `${socketOrigin}${UPGRADE_PATH}?ticket=${encodeURIComponent(ticket)}`;
}
