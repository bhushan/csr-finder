import { isAdmin } from "@/lib/admin";
import { leadsFor } from "@/lib/repo";
import type { Digest } from "@/lib/types";

export async function briefingProps(digest: Digest) {
  const [leads, admin] = await Promise.all([leadsFor(digest.items.map((i) => i.id)), isAdmin()]);
  return { digest, leads, admin };
}
