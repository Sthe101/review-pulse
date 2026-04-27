import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ReviewPulse",
    template: "%s — ReviewPulse",
  },
  description: "AI-powered customer review analysis",
  keywords: [
    "review analysis",
    "customer feedback",
    "sentiment analysis",
    "AI reviews",
    "Google reviews",
    "Trustpilot analysis",
    "G2 reviews",
    "Birdeye alternative",
  ],
  applicationName: "ReviewPulse",
  authors: [{ name: "ReviewPulse" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "ReviewPulse",
    locale: "en_US",
    url: SITE_URL,
    title: "ReviewPulse",
    description: "AI-powered customer review analysis",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReviewPulse",
    description: "AI-powered customer review analysis",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
