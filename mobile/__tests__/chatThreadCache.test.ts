import type { InfiniteData } from '@tanstack/react-query';
import { absorbIntoThreadCache, nextCursorOf } from '../src/query/chatQueries';
import type { ChatMessageResponse, Page } from '../src/types/api';


function wire(id: string, body = 'Hello'): ChatMessageResponse {
  return {
    id,
    author: { travelerId: 'maya', handle: 'mayasantos', displayName: 'Maya Santos' },
    body,
    at: '2026-03-03T09:00:00.000Z',
  };
}


function pages(...items: ChatMessageResponse[][]): InfiniteData<Page<ChatMessageResponse>> {
  return {
    pages: items.map((page) => ({ items: page, nextCursor: undefined })),
    pageParams: items.map(() => undefined),
  };
}


describe('absorbing a socket event into the thread cache', () => {

  it('puts a newly delivered message at the head of the newest page', () => {
    const absorbed = absorbIntoThreadCache(pages([wire('b')]), wire('c'));

    expect(absorbed?.pages[0]?.items.map((item) => item.id)).toEqual(['c', 'b']);
  });


  it('ignores a message it already holds, which is how a sender own broadcast reconciles', () => {
    const before = pages([wire('b')]);

    expect(absorbIntoThreadCache(before, wire('b'))).toBe(before);
  });


  it('looks across every page, not only the newest, before deciding it is new', () => {
    const before = pages([wire('c')], [wire('b')]);

    expect(absorbIntoThreadCache(before, wire('b'))).toBe(before);
  });


  it('leaves an unfetched cache alone rather than inventing a first page', () => {
    expect(absorbIntoThreadCache(undefined, wire('c'))).toBeUndefined();
  });


  it('never mutates the page it was handed', () => {
    const before = pages([wire('b')]);
    absorbIntoThreadCache(before, wire('c'));

    expect(before.pages[0]?.items.map((item) => item.id)).toEqual(['b']);
  });
});


describe('the exhausted cursor (the S3.1 trap)', () => {

  it('reads a null nextCursor as exhausted, never as a page named null', () => {
    const exhausted = { items: [wire('b')], nextCursor: null } as unknown as Page<
      ChatMessageResponse
    >;

    expect(nextCursorOf(exhausted)).toBeUndefined();
  });


  it('reads an absent nextCursor as exhausted too', () => {
    expect(nextCursorOf({ items: [] })).toBeUndefined();
  });


  it('hands a real cursor straight through', () => {
    expect(nextCursorOf({ items: [wire('b')], nextCursor: 'abc' })).toBe('abc');
  });
});
