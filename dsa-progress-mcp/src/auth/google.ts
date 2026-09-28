import { OAuth2Client } from "google-auth-library";

/** The Google account that signed in. `sub` is Google's stable user id. */
export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

/** The Google sign-in steps the auth flow needs; swapped for a fake in tests. */
export interface GoogleSignIn {
  /** URL of Google's consent screen; Google sends `state` back to the callback unchanged. */
  authUrl(state: string): string;
  /** Exchanges the code from Google's callback for the verified identity of the user. */
  identify(code: string): Promise<GoogleIdentity>;
}

export function createGoogleSignIn(options: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): GoogleSignIn {
  const client = new OAuth2Client(options);
  return {
    authUrl: (state) =>
      client.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        state,
        prompt: "select_account",
      }),
    identify: async (code) => {
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) throw new Error("Google did not return an ID token");
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: options.clientId });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new Error("Google ID token is missing sub or email");
      if (!payload.email_verified) throw new Error("Google account email is not verified");
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        picture: payload.picture ?? null,
      };
    },
  };
}
