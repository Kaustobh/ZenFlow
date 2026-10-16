import type { Metadata } from "next";
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
  title: {
    default: "ZenFlow: Zen Plan — Spatial Whiteboard",
    template: "%s | Zen Plan",
  },
  description:
    "A calm, Japandi-inspired infinite digital canvas engineered with tactile acoustics, kinetic glide navigation, and frictionless thought-chaining.",
  applicationName: "Zen Plan",
  authors: [{ name: "Kaustobh Bhattacharya", url: "https://github.com/Kaustobh" }],
  creator: "Kaustobh Bhattacharya",
  keywords: [
    "ZenFlow",
    "Zen Plan",
    "spatial canvas",
    "whiteboard",
    "Japandi design",
    "visual thinking",
    "infinite canvas",
    "mind mapping",
    "tactile UI",
    "minimalist workspace",
    "CRDT",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/icon.svg",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://zen-flow-whiteboard.vercel.app",
    siteName: "Zen Plan",
    title: "ZenFlow: Zen Plan — Spatial Whiteboard",
    description:
      "A calm, Japandi-inspired infinite digital canvas engineered with tactile acoustics, kinetic glide navigation, and frictionless thought-chaining.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZenFlow: Zen Plan — Spatial Whiteboard",
    description:
      "A calm, Japandi-inspired infinite digital canvas engineered with tactile acoustics, kinetic glide navigation, and frictionless thought-chaining.",
    creator: "@Kaustobh",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
