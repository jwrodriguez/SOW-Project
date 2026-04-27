// app/actions.ts
"use server"

import { db } from "@/db";
import { TEMPLATE } from "@/db/schema";
import { eq } from "drizzle-orm";

const SINGLETON_ID = "00000000-0000-0000-0000-000000000001";

export async function getGlobalTemplate() {
  try {
    const result = await db
      .select()
      .from(TEMPLATE)
      .where(eq(TEMPLATE.id, SINGLETON_ID))
      .limit(1);

    // If the row exists, return the content; otherwise return null
    return result.length > 0 ? result[0].content : null;
  } catch (error) {
    console.error("Failed to fetch template:", error);
    throw new Error("Failed to fetch template from database");
  }
}