import type { Metadata } from "next";
import "@fontsource-variable/archivo";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team Starters",
  description:
    "Free team surveys from Stratechi. Ask your team, get an AI readout, and start the right conversation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="bg-navy text-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Team Starters <span className="text-gold">by Stratechi</span>
            </Link>
            <a
              href="https://www.stratechi.com/exceptional-leadership/"
              className="text-sm text-white/80 hover:text-white"
            >
              Exceptional Leadership
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
        <footer className="border-t border-line print:hidden">
          <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-6 py-6 text-sm text-gray-500">
            <span>Team Starters by Stratechi</span>
            <Link href="/privacy" className="hover:text-navy">Privacy</Link>
            <Link href="/terms" className="hover:text-navy">Terms</Link>
            <a href="https://www.stratechi.com/" className="hover:text-navy">stratechi.com</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
