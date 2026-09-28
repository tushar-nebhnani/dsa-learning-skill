import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/** The signed-in learner's id, set by DsaOAuthProvider.verifyAccessToken. */
export function learnerId(authInfo: AuthInfo | undefined): string {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string") throw new Error("Not signed in");
  return userId;
}
