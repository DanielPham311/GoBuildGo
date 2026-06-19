import { NextResponse } from "next/server";

// Standard API envelopes & error format. Reference: docs/API_DESIGN.md §11.

/** Field-level validation error entry. */
export type FieldError = { field: string; message: string };

/** Documented error codes → HTTP status (API_DESIGN.md §11 "Common Error Codes"). */
export const ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501, // scaffold-only signal; not part of the documented set
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

/** Standard error response: `{ error: { code, message, details? } }`. */
export function jsonError(code: ErrorCode, message: string, details?: FieldError[]) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status: ERROR_STATUS[code] },
  );
}

/** Paginated list envelope: `{ data, total, page, limit, totalPages }`. */
export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

/** Placeholder for endpoints whose handler logic is not implemented yet. */
export function notImplemented(endpoint: string) {
  return jsonError("NOT_IMPLEMENTED", `${endpoint} is not implemented yet`);
}
