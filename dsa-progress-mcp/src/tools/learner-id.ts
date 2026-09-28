import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { UnauthorizedError } from "../utils/errors.js";

/** The signed-in learner's id, set by DsaOAuthProvider.verifyAccessToken. */
export function learnerId(authInfo: AuthInfo | undefined): string {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string") throw new UnauthorizedError("Not signed in. Connect your DSA Progress account and try again.");
  return userId;
}
