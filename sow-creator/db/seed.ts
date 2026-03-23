/**
 * Seed script: `npx tsx db/seed.ts`
 *
 * Seeds through Better Auth's signUpEmail API (not raw inserts) so
 * passwords get hashed and user + account rows are created together.
 */
import { auth } from "../lib/auth";

async function seed() {
  console.log("Seeding database...\n");

  const testUsers = [
    {
      name: "Admin User",
      email: "admin@sowizard.mil",
      password: "password123",
      role: "ADMIN",
    },
    {
      name: "John Doe",
      email: "user@sowizard.mil",
      password: "password123",
      role: "USER",
    },
  ];

  for (const user of testUsers) {
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: user.name,
          email: user.email,
          password: user.password,
        },
      });

      if (result?.user) {
        console.log(`Created user: ${user.email}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists") || message.includes("UNIQUE")) {
        console.log(`User ${user.email} already exists, skipping...`);
      } else {
        console.log(`Error creating ${user.email}: ${message}`);
      }
    }
  }

  console.log("\nSeeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
