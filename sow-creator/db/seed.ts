import { db } from "./index";
import { users } from "./schema";

async function seed() {
  console.log("Seeding database...\n");

  // Create test users
  const testUsers = [
    {
      name: "Admin User",
      email: "admin@sowizard.mil",
      passwordHash: "password123", // Plain text for now (no hashing yet)
      role: "ADMIN",
    },
    {
      name: "John Doe",
      email: "user@sowizard.mil",
      passwordHash: "password123",
      role: "USER",
    },
  ];

  for (const user of testUsers) {
    try {
      await db.insert(users).values(user).onConflictDoNothing();
      console.log(`Created user: ${user.email}`);
    } catch (error) {
      console.log(`User ${user.email} may already exist, skipping...`);
    }
  }

  console.log("\nSeeding complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
