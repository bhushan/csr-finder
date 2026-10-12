import { z } from "zod";

export const LEAD_STATUSES = ["new", "to_call", "contacted", "meeting", "not_a_fit"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_LABEL: Record<LeadStatus, string> = {
  new: "New",
  to_call: "To call",
  contacted: "Contacted",
  meeting: "Meeting set",
  not_a_fit: "Not a fit",
};

export const LeadUpdate = z.object({
  digestId: z.string().min(1),
  company: z.string().max(200).default(""),
  status: z.enum(LEAD_STATUSES).optional(),
  note: z.string().max(2000).optional(),
});

export type Lead = {
  itemId: string;
  digestId: string;
  company: string;
  status: LeadStatus;
  note: string;
  draft: { subject: string; body: string; createdAt: string } | null;
  updatedAt: string;
};
