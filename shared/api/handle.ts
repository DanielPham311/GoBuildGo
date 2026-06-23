import { ZodError } from "zod";
import { AuthError } from "@/shared/auth/helpers";
import { SetupError } from "@/modules/setups/service";
import { UserError } from "@/modules/users/service";
import { PriceError } from "@/modules/prices/service";
import { jsonError, type ErrorCode } from "./response";

/** SetupError codes that aren't in the standard ErrorCode set map to 400. */
const SETUP_CODE_TO_HTTP: Record<string, ErrorCode> = {
  NOT_FOUND: "NOT_FOUND",
  FORBIDDEN: "FORBIDDEN",
  INVALID_COMPONENT: "VALIDATION_ERROR",
  DUPLICATE_SLUG: "CONFLICT",
};

/** Map a thrown error to a standard error response. Re-throws unknown errors. */
export function toErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return jsonError(err.code, err.message);
  }
  if (err instanceof SetupError) {
    return jsonError(SETUP_CODE_TO_HTTP[err.code] ?? "VALIDATION_ERROR", err.message);
  }
  if (err instanceof UserError) {
    return jsonError("NOT_FOUND", err.message);
  }
  if (err instanceof PriceError) {
    return jsonError("NOT_FOUND", err.message);
  }
  if (err instanceof ZodError) {
    return jsonError(
      "VALIDATION_ERROR",
      "Invalid request body",
      err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    );
  }
  throw err;
}
