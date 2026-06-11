import { redirect } from "next/navigation";

// Root → always go straight to the selection screen during development.
// Phase 4 will turn this into the full landing experience.
export default function HomePage() {
  redirect("/select");
}
