import { getServerSession } from "next-auth";
import { authOptions } from "./options";

/** Current authenticated user (or null). Use in route handlers / Server Components. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/** Throws UNAUTHENTICATED if no session. Returns the user otherwise. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED", "Authentication required");
  return user;
}

/** Throws FORBIDDEN if the user is not an admin. */
export async function requireAdmin() {
  const user = await requireUser();
  // TODO: wire role check once `role` is added to the session (ENGINEERING_PATTERNS.md §1).
  return user;
}

/** Thrown by auth helpers; route handlers map this to the standard error envelope. */
export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
