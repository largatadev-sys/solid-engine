
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly traceId: string | undefined;

  readonly details: Record<string, unknown> | undefined;

  constructor(args: {
    code: string;
    message: string;
    status: number;
    traceId?: string;
    details?: Record<string, unknown>;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.code = args.code;
    this.status = args.status;
    this.traceId = args.traceId;
    this.details = args.details;
  }


  detailNumber(field: string): number | undefined {
    const value = this.details?.[field];
    return typeof value === 'number' ? value : undefined;
  }


  static offline(): ApiError {
    return new ApiError({
      code: 'NETWORK_UNAVAILABLE',
      message: 'Could not reach the server. Check your connection.',
      status: 0,
    });
  }
}
