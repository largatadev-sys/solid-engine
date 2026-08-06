export interface MediaSource {
  readonly uri: string;
  readonly headers?: Record<string, string>;
}

export function isOurMedia(url: string): boolean {
  return url.startsWith('/v1/media/');
}
