import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CSR Partnership Radar",
  description: "Weekly AI-curated CSR intelligence for education and skilling NGOs: who to call this week, and why.",
};

const nav = [
  { href: "/", label: "This week" },
  { href: "/digests", label: "Archive" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="inline-block size-2.5 rounded-full bg-accent" />
              CSR Partnership Radar
            </Link>
            <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-ink">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          Live data from Google News and Bing News · Analysis by Gemini Flash · Delivered Mondays 7:30 IST
        </footer>
      </body>
    </html>
  );
}
