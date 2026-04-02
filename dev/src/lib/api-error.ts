export const ErrorCodes = {
  INVALID_INPUT: { code: "INVALID_INPUT", status: 400 },
  NOT_FOUND: { code: "NOT_FOUND", status: 404 },
  DUPLICATE: { code: "DUPLICATE", status: 409 },
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", status: 500 },
  DB_CONNECTION_ERROR: { code: "DB_CONNECTION_ERROR", status: 503 },
} as const;

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(
    code: keyof typeof ErrorCodes,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.code = ErrorCodes[code].code;
    this.status = ErrorCodes[code].status;
    this.details = details;
  }
}
