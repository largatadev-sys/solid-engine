import { pollRepository } from '../src/repositories/pollRepository';

jest.mock('../src/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  },
}));

const { apiClient } = jest.requireMock('../src/api/apiClient') as {
  apiClient: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});


describe('pollRepository — every poll act is one workspace-scoped path', () => {
  it('reads the whole board in one request, with no cursor — the board does not page', async () => {
    apiClient.get.mockResolvedValue({ active: [], completed: [], memberCount: 0 });

    await pollRepository.board('trip-1');

    expect(apiClient.get).toHaveBeenCalledWith('/v1/itineraries/trip-1/polls');
  });

  it('creates a poll by POSTing the question, options and deadline together', async () => {
    apiClient.post.mockResolvedValue({ id: 'p1' });
    const request = { question: 'Dinner?', options: ['A', 'B'], closesAt: '2026-10-24T18:00:00Z' };

    await pollRepository.create('trip-1', request);

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/trip-1/polls', request);
  });

  it('votes with PUT, because re-voting is the same call as voting — the INV-10 upsert', async () => {
    apiClient.put.mockResolvedValue({ id: 'p1' });

    await pollRepository.vote('trip-1', 'p1', { optionId: 'o2' });

    expect(apiClient.put).toHaveBeenCalledWith('/v1/itineraries/trip-1/polls/p1/vote', {
      optionId: 'o2',
    });
  });

  it('closes with an explicitly bodyless POST rather than an accidental undefined body', async () => {
    apiClient.post.mockResolvedValue({ id: 'p1' });

    await pollRepository.close('trip-1', 'p1');

    expect(apiClient.post).toHaveBeenCalledWith('/v1/itineraries/trip-1/polls/p1/close', undefined);
  });

  it('deletes the poll itself, never the board', async () => {
    apiClient.delete.mockResolvedValue(undefined);

    await pollRepository.remove('trip-1', 'p1');

    expect(apiClient.delete).toHaveBeenCalledWith('/v1/itineraries/trip-1/polls/p1');
  });
});
