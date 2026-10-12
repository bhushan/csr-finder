import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  // Monday 02:00 UTC = 07:30 IST, before the outreach week starts.
  crons: [{ path: "/api/cron/weekly", schedule: "0 2 * * 1" }],
};
