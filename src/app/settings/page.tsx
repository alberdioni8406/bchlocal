import { redirect } from "next/navigation";

/** Canonical settings lives at /profile/settings — keep /settings working. */
export default function SettingsRedirect() {
  redirect("/profile/settings");
}
