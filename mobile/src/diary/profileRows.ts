import type {
  DiaryPostcardResponse,
  DiarySectionResponse,
  DiarySectionsResponse,
} from '../types/api';


export type ProfileRow =
  | { readonly kind: 'diary'; readonly section: DiarySectionResponse; readonly at: string }
  | { readonly kind: 'postcard'; readonly postcard: DiaryPostcardResponse; readonly at: string };


export function latestActivityOf(section: DiarySectionResponse): string {
  let latest = section.updatedAt;
  for (const day of section.days) {
    for (const postcard of day.postcards) {
      if (isAfter(postcard.createdAt, latest)) latest = postcard.createdAt;
    }
  }
  return latest;
}


export function profileRows(sections: DiarySectionsResponse): ProfileRow[] {
  const rows: ProfileRow[] = [
    ...sections.diaries.map((section) => ({
      kind: 'diary' as const,
      section,
      at: latestActivityOf(section),
    })),
    ...sections.loosePostcards.map((postcard) => ({
      kind: 'postcard' as const,
      postcard,
      at: postcard.createdAt,
    })),
  ];
  return rows.sort((a, b) => (isAfter(a.at, b.at) ? -1 : isAfter(b.at, a.at) ? 1 : 0));
}


function isAfter(a: string, b: string): boolean {
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (Number.isNaN(left) || Number.isNaN(right)) return a > b;
  return left > right;
}
