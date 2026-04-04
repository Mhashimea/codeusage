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
  title: "Know How Your Team Uses AI Coding Tools | Codeusage",
  description:
    "Codeusage tracks AI coding activity across your engineering team — who's active, which projects are moving, and what tasks are getting done. Automatic credential protection included.",
  keywords: [
    "AI coding tool tracker",
    "team AI dashboard",
    "AI coding activity",
    "developer productivity tracking",
    "AI tool usage analytics",
    "AI coding tool tracker for teams",
    "team AI coding dashboard",
    "AI coding tool usage tracking",
    "engineering team AI productivity",
    "Claude Code team analytics",
    "AI developer tool monitoring",
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
    title: "Know How Your Team Uses AI Coding Tools | Codeusage",
    description:
      "Codeusage tracks AI coding activity across your engineering team — who's active, which projects are moving, and what tasks are getting done.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Codeusage — AI Coding Intelligence for Teams",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@hashim_ea",
    title: "Know How Your Team Uses AI Coding Tools | Codeusage",
    description:
      "Track AI coding activity across your team — developers, projects, and tasks. Automatic credential protection included.",
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
  url: "https://codeusage.dev",
  description:
    "Codeusage tracks AI coding activity across engineering teams — who's active, which projects are moving, and what tasks are getting done. Built-in credential protection blocks sensitive data before it reaches any AI model.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "macOS, Linux, Windows",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free plan available",
  },
  publisher: {
    "@type": "Organization",
    name: "Codeusage",
    url: "https://codeusage.dev",
  },
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
