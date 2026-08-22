export interface MediaSource {
  readonly uri: string;
  readonly headers?: Record<string, string>;
}

const CAPABILITY_SCOPED_COVERS = ['/v1/join/', '/v1/invitations/'];


export function isOurMedia(url: string): boolean {
  if (url.startsWith('/v1/media/')) return true;
  return CAPABILITY_SCOPED_COVERS.some(
    (prefix) => url.startsWith(prefix) && url.endsWith('/cover'),
  );
}

export function thumbOf(url: string | null): string | null {
  if (url === null || url === '' || !url.startsWith('/v1/media/')) return url;
  return `${url}/thumb`;
}
