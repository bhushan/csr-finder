import { cookies } from "next/headers";
import { verifyAdminToken } from "@/lib/auth-token";

export const ADMIN_COOKIE = "radar_admin";

export async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminToken(token, process.env.ADMIN_PASSCODE);
}
