export const joinKeys = {
  all: ['join'] as const,
  link: (itineraryId: string) => [...joinKeys.all, 'link', itineraryId] as const,
  teaser: (token: string) => [...joinKeys.all, 'teaser', token] as const,
  requests: (itineraryId: string) => [...joinKeys.all, 'requests', itineraryId] as const,
  mine: () => [...joinKeys.all, 'mine'] as const,
};
