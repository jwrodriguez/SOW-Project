import { redirect } from "next/navigation";

// Default route for /resources — redirects to the Clause Library tab.
// The resources layout.tsx renders the tab bar (Clause Library / Compliance Check)
// so both tabs are always visible regardless of which subpage is active.
export default function ResourcesPage() {
  redirect("/resources/clauses");
}