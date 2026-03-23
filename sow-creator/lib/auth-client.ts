/**
 * Better Auth, client-side utilities.
 * This talks to /api/auth/* via fetch. Never import lib/auth.ts from here.
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
