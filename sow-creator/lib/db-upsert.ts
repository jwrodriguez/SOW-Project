"use server"

import { db } from "@/db";
import { TEMPLATE } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {TemplateData} from "@/types/pageTypes";

// A fixed UUID to ensure we only ever edit the same single row
const SINGLETON_ID = "00000000-0000-0000-0000-000000000001";

interface saveNotification {
    success: boolean,
    error?: string
}


export async function saveGlobalTemplate(data: TemplateData): Promise<saveNotification> {
  try {
    await db
      .insert(TEMPLATE)
      .values({
        id: SINGLETON_ID,
        name: data.documentName || "Global Template",
        content: data, // Drizzle handles the JSON conversion
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: TEMPLATE.id,
        set: {
          name: data.documentName,
          content: data,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/"); // Update the UI cache
    return { success: true };
  } catch (error) {
    console.error("Failed to save template:", error);
    return { success: false, error: "Database update failed" };
  }
}