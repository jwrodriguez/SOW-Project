/**
 * DB client: singleton connection shared across the app.
 *
 * `postgres` = raw driver / connection pool.
 * `drizzle`  = type-safe ORM layer on top.
 * Node caches this module, so all imports share one pool.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
