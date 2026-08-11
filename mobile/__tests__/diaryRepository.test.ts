import { diaryRepository } from '../src/repositories/diaryRepository';
import type { DiaryEntryResponse } from '../src/types/api';


jest.mock('../src/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  },
}));

jest.mock('../src/media/appendPhoto', () => ({
  appendPhoto: jest.fn(),
}));

const { apiClient } = jest.requireMock('../src/api/apiClient') as {
  apiClient: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
    upload: jest.Mock;
  };
};

const { appendPhoto } = jest.requireMock('../src/media/appendPhoto') as {
  appendPhoto: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});


function entry(id: string): DiaryEntryResponse {
  return {
    id,
    itineraryId: 'i1',
    activityId: 'a1',
    activityTitle: 'Sunset at Las Cabanas',
    dayLabel: 'Day 1',
    timeOfDay: null,
    caption: null,
    photos: [],
    createdAt: '2026-08-11T10:00:00Z',
    updatedAt: '2026-08-11T10:00:00Z',
  };
}


describe('fetchEveryEntry', () => {
  it('asks for the first page with no cursor at all', async () => {
    apiClient.get.mockResolvedValue({ items: [entry('e1')], nextCursor: null });

    await diaryRepository.fetchEveryEntry('i1');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries/i1/diary/entries');
  });

  it('stops on a null nextCursor rather than asking the server for a page called "null"', async () => {
    apiClient.get.mockResolvedValue({ items: [entry('e1')], nextCursor: null });

    const collected = await diaryRepository.fetchEveryEntry('i1');

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(collected.map((e) => e.id)).toEqual(['e1']);
  });

  it('stops rather than spinning forever if the server ever repeats a cursor', async () => {
    apiClient.get.mockResolvedValue({ items: [entry('e1')], nextCursor: 'always-the-same' });

    const collected = await diaryRepository.fetchEveryEntry('i1');

    expect(apiClient.get).toHaveBeenCalledTimes(2);
    expect(collected).toHaveLength(2);
  });

  it('follows a real cursor until the list is exhausted', async () => {
    apiClient.get
      .mockResolvedValueOnce({ items: [entry('e1')], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [entry('e2')], nextCursor: undefined });

    const collected = await diaryRepository.fetchEveryEntry('i1');

    expect(collected.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/v1/itineraries/i1/diary/entries?cursor=c1');
  });
});


describe('post', () => {
  it('sends the entry as a plain string part, so no client has to type a JSON part', async () => {
    apiClient.upload.mockResolvedValue(entry('e1'));

    await diaryRepository.post(
      'i1',
      { activityId: 'a1', caption: 'hello', fromDump: ['p1'] },
      [{ uri: 'file://x.jpg', name: 'x.jpg', mimeType: 'image/jpeg' }],
    );

    const [path, form] = apiClient.upload.mock.calls[0] as [string, FormData];
    expect(path).toBe('/v1/itineraries/i1/diary/entries');
    expect(form.get('entry')).toBe(
      JSON.stringify({ activityId: 'a1', caption: 'hello', fromDump: ['p1'] }),
    );
    expect(appendPhoto).toHaveBeenCalledTimes(1);
  });
});
