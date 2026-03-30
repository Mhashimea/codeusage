import type { Metadata } from "next";
import { Fira_Sans, Fira_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Providers } from "./providers";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaMono = Fira_Mono({
  variable: "--font-fira-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Codeusage - AI Coding Tool Analytics for Engineering Teams",
  description:
    "Track Claude Code and Codex usage, monitor AI coding costs, and measure developer productivity across your engineering team. Get real-time insights into AI tool adoption and ROI.",
  keywords: [
    "AI coding analytics",
    "Claude Code monitoring",
    "AI developer productivity",
    "AI coding tool tracking",
    "engineering team AI usage",
    "AI coding assistant ROI",
    "developer productivity analytics",
    "AI code generation metrics",
    "Claude Code cost tracking",
    "Codex usage monitoring",
    "AI pair programming analytics",
    "engineering productivity tools",
    "AI coding cost management",
    "developer team analytics",
    "AI tool adoption metrics",
  ],
  authors: [{ name: "Codeusage" }],
  creator: "Codeusage",
  publisher: "Codeusage",
  metadataBase: new URL("https://codeusage.dev"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://codeusage.dev",
    siteName: "Codeusage",
    title: "Codeusage - AI Coding Tool Analytics for Engineering Teams",
    description:
      "Track Claude Code and Codex usage, monitor AI coding costs, and measure developer productivity. Real-time insights into AI tool adoption and ROI for engineering leaders.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Codeusage - AI Coding Tool Analytics Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Codeusage - AI Coding Tool Analytics for Engineering Teams",
    description:
      "Track Claude Code and Codex usage, monitor AI coding costs, and measure developer productivity across your engineering team.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "G-KCDEDY5ZQS",
  },
  category: "technology",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Codeusage",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Cross-platform",
  description:
    "AI coding tool analytics platform for engineering teams. Track Claude Code and Codex usage, monitor costs, and measure developer productivity with real-time insights.",
  url: "https://codeusage.dev",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free during beta",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5",
    ratingCount: "1",
  },
  featureList: [
    "AI coding tool usage tracking",
    "Claude Code integration",
    "Codex integration",
    "Real-time cost monitoring",
    "Developer productivity metrics",
    "Project-level analytics",
    "Team usage insights",
    "Privacy-first design",
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Codeusage",
  url: "https://codeusage.dev",
  logo: "https://codeusage.dev/logo.png",
  description:
    "AI coding tool intelligence platform for engineering teams",
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body
        className={`${firaSans.variable} ${firaMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
      <GoogleAnalytics gaId="G-KCDEDY5ZQS" />
    </html>
  );
}
