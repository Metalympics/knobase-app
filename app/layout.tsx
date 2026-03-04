import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { AuthProvider } from "@/lib/auth/provider";
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
  title: "Knobase — Human-AI Workspace",
  description:
    "Real-time collaboration for teams and AI agents. Invite colleagues, invite your agent, work side by side. The workspace OpenClaw should have been.",
  keywords: [
    "AI collaboration",
    "human AI workspace",
    "OpenClaw",
    "real-time editing",
    "agent workspace",
    "Knobase",
    "AI agents",
    "team collaboration",
  ],
  metadataBase: new URL("https://app.knobase.com"),
  openGraph: {
    title: "Knobase — Human-AI Workspace",
    description:
      "Real-time collaboration for teams and AI agents. Invite colleagues, invite your agent, work side by side.",
    type: "website",
    url: "https://app.knobase.com",
    siteName: "Knobase",
  },
  twitter: {
    card: "summary_large_image",
    title: "Knobase — Human-AI Workspace",
    description:
      "Real-time collaboration for teams and AI agents. The workspace OpenClaw should have been.",
  },
  alternates: {
    canonical: "https://app.knobase.com",
  },
  manifest: "/manifest.webmanifest",
};

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { send_page_view: true });
              `}
            </Script>
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
        suppressHydrationWarning
      >
        <PostHogProvider>
          <AuthProvider>
            <Suspense>
              <PageViewTracker />
            </Suspense>
            {children}
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
