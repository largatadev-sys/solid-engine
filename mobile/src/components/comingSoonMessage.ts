
export function comingSoonMessage(what: string): { title: string; body: string } {
  return {
    title: `${what} — coming soon`,
    body: 'This part of the app is still being built. It will arrive in a later update.',
  };
}
