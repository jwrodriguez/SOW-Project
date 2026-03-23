// /templates just redirects to /templates/base (the default view).
import { redirect } from "next/navigation";

export default function TemplatesPage() {
  redirect("/templates/base");
}
