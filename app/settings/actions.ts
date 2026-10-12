"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminToken } from "@/lib/auth-token";
import { ADMIN_COOKIE, isAdmin } from "@/lib/admin";
import { saveSettings } from "@/lib/repo";
import { SettingsSchema } from "@/lib/settings";

export type ActionState = { ok?: boolean; error?: string };

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) return { error: "ADMIN_PASSCODE is not configured on the server." };
  if (String(form.get("passcode") ?? "") !== passcode) return { error: "That passcode didn't match. Check with your admin and try again." };
  (await cookies()).set(ADMIN_COOKIE, await adminToken(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  revalidatePath("/settings");
}

export async function updateSettings(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { error: "Your session expired. Sign in again to save." };
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("settings") ?? ""));
  } catch {
    return { error: "Could not read the form. Reload the page and try again." };
  }
  const parsed = SettingsSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Check "${issue.path.join(" → ") || "settings"}": ${issue.message}` };
  }
  await saveSettings(parsed.data);
  return { ok: true };
}
