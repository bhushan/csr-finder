import { Resend } from "resend";
import type { Digest } from "@/lib/types";
import { renderDigestEmail } from "./render";

export function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export type SendResult = { sent: string[]; skipped?: string; error?: string };

export async function sendDigestEmail(digest: Digest, recipients: string[]): Promise<SendResult> {
  if (!recipients.length) return { sent: [], skipped: "No recipients configured in Settings" };
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: [], skipped: "RESEND_API_KEY is not set" };

  const { subject, html, text } = renderDigestEmail(digest, appUrl());
  const { error } = await new Resend(key).emails.send({
    from: process.env.EMAIL_FROM || "CSR Radar <onboarding@resend.dev>",
    to: recipients,
    subject,
    html,
    text,
  });
  if (error) return { sent: [], error: `${error.name}: ${error.message}` };
  return { sent: recipients };
}
