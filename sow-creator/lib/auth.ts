/**
 * Better Auth, server-side config.
 * Only import this in server contexts (API routes, seed, middleware).
 * For client-side auth, use lib/auth-client.ts.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

export const auth = betterAuth({
  // Connects to our Drizzle schema (user, session, account, verification tables).
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
  },

  // Microsoft Entra ID SSO. Allows users to sign in
  // with their organizational Microsoft account. `tenantId` defaults to
  // "common" (any tenant) but can be locked to a specific org.
  socialProviders: {
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
      tenantId: process.env.MICROSOFT_TENANT_ID || "common",
    },
  },

  // Custom role field. `input: false` prevents users from setting their own role.
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
    },
  },

  // UUIDs for all PKs to match our Drizzle schema.
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
});
