import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UniHub Workshop",
  description: "UniHub Workshop scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-slate-900">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-black/10 bg-white/75 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-xs font-semibold text-white">
                  UH
                </span>
                <div className="leading-tight">
                  <p className="text-sm uppercase tracking-[0.2em] text-orange-700">
                    Unihub
                  </p>
                  <p className="text-lg font-semibold">Workshop</p>
                </div>
              </Link>
              <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
                <Link className="hover:text-slate-900" href="/workshops">
                  Workshops
                </Link>
                <Link className="hover:text-slate-900" href="/notifications">
                  Notifications
                </Link>
                <Link className="hover:text-slate-900" href="/login">
                  Login
                </Link>
                <Link className="hover:text-slate-900" href="/admin">
                  Admin
                </Link>
              </nav>
              <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-slate-600">
                Scaffold
              </div>
            </div>
          </header>
          <main className="flex-1 px-6 pb-16 pt-10 sm:px-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
              {children}
            </div>
          </main>
          <footer className="border-t border-black/10 bg-white/60">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-slate-500 sm:px-10">
              <p>
                UniHub Workshop scaffold - build features in the next phase.
              </p>
              <p>API base URL defaults to http://localhost:8080.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
