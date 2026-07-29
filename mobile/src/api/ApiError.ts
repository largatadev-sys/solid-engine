
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly traceId: string | undefined;

  constructor(args: { code: string; message: string; status: number; traceId?: string }) {
    super(args.message);
    this.name = 'ApiError';
    this.code = args.code;
    this.status = args.status;
    this.traceId = args.traceId;
  }


  static offline(): ApiError {
    return new ApiError({
      code: 'NETWORK_UNAVAILABLE',
      message: 'Could not reach the server. Check your connection.',
      status: 0,
    });
  }
}
