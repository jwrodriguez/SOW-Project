// Catch-all route. Delegates all /api/auth/* requests to Better Auth.
// toNextJsHandler adapts it to Next.js App Router format (GET + POST exports).
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
