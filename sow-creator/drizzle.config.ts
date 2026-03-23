// Drizzle Kit CLI config (npx drizzle-kit push / generate).
// Not imported at runtime, only used by the CLI.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
