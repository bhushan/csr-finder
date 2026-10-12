import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Schibsted_Grotesk } from "next/font/google";
import { NavLinks } from "@/components/NavLinks";
import { RadarMark } from "@/components/RadarMark";
import "./globals.css";

const brand = Schibsted_Grotesk({ variable: "--font-brand", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000",
  ),
  title: { default: "CSR Partnership Radar", template: "%s · CSR Partnership Radar" },
  description:
    "A Monday briefing for NGO partnership teams: which companies just moved on education and skilling CSR, and who is worth a call this week.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${brand.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
              <RadarMark animated />
              <span>CSR Partnership Radar</span>
            </Link>
            <Suspense fallback={<div className="ml-auto" />}>
              <NavLinks />
            </Suspense>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-[13px] text-muted sm:flex-row sm:justify-between sm:px-6">
            <span>Live news from Google News and Bing News, read by Gemini Flash.</span>
            <span>New briefing every Monday at 7:30 am IST.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
