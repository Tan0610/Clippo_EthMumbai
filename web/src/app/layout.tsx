import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Lexend, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./testdeploy.css";
import { Masthead, Dateline, Footer, TestnetBanner } from "@/components/Shell";
import { UiFx } from "@/components/ui/UiFx";

// One family for the whole interface (variable font, weights 100-900) plus a mono for money, addresses and hashes.
const text = Lexend({
  variable: "--font-text",
  subsets: ["latin"],
  display: "swap",
});
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

const testDeploy = process.env.NEXT_PUBLIC_TEST_DEPLOY === "1";

export const metadata: Metadata = {
  ...(testDeploy ? { robots: { index: false, follow: false, nocache: true } } : {}),
  title: { default: "Clippo — pay only for clips that passed", template: "%s · Clippo" },
  description:
    "Fund a USDC pool. Verified humans post clips. An agent checks each one against your brief. Views settle on-chain, creators claim their own money.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${text.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <TestnetBanner />
        <Dateline />
        <Suspense fallback={<header className="masthead" style={{ minHeight: 96 }} />}>
          <Masthead />
        </Suspense>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <UiFx />
      </body>
    </html>
  );
}
