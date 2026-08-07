export interface MediaSource {
  readonly uri: string;
  readonly headers?: Record<string, string>;
}

export function isOurMedia(url: string): boolean {
  return url.startsWith('/v1/media/');
}

export function thumbOf(url: string | null): string | null {
  if (url === null || url === '' || !isOurMedia(url)) return url;
  return `${url}/thumb`;
}
