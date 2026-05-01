/**
 * Better Auth, client-side utilities.
 * This talks to /api/auth/* via fetch. Never import lib/auth.ts from here.
 */
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  // ... other client config
  plugins: [
    inferAdditionalFields<typeof auth>(), // This maps server-side types to the client
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
