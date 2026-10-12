import { z } from "zod";

export const SettingsSchema = z.object({
  orgName: z.string().trim().min(1).max(120),
  orgProfile: z.string().trim().min(1).max(1500),
  sectors: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        keywords: z.array(z.string().trim().min(1).max(60)).min(1).max(8),
      }),
    )
    .min(1)
    .max(10),
  geographies: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      }),
    )
    .min(1)
    .max(15),
  recipients: z.array(z.email()).max(10),
  excludedCompanies: z.array(z.string().trim().min(1).max(80)).max(50),
  lookbackDays: z.number().int().min(1).max(14),
  maxItems: z.number().int().min(5).max(40),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  orgName: "Ananya's skilling NGO (Pune)",
  orgProfile:
    "Pune-based education NGO that designs and delivers skilling programmes for school dropouts and first-generation job seekers: employability, vocational and digital skills, placement support. Funded mainly through corporate CSR partnerships; looking for companies actively allocating CSR budget to education and skilling and seeking credible implementation partners.",
  sectors: [
    { name: "Education", keywords: ["education", "school", "learning"] },
    { name: "Skill development", keywords: ["skill development", "skilling", "vocational training"] },
    { name: "Digital literacy", keywords: ["digital literacy", "digital skills", "coding"] },
    { name: "Youth employment", keywords: ["youth employment", "employability", "placement"] },
  ],
  geographies: [
    { name: "Pune", tier: 1 },
    { name: "Maharashtra", tier: 1 },
    { name: "Mumbai", tier: 2 },
    { name: "India", tier: 3 },
  ],
  recipients: [],
  excludedCompanies: [],
  lookbackDays: 7,
  maxItems: 20,
};

/** Parse loosely stored settings, filling gaps from defaults so older rows keep working. */
export function parseSettings(input: unknown): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...(typeof input === "object" && input ? input : {}) };
  const result = SettingsSchema.safeParse(merged);
  return result.success ? result.data : DEFAULT_SETTINGS;
}
