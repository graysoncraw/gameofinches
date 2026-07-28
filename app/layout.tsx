import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const imageUrl = new URL("/og.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title: "Game of Inches | Fantasy Football League",
    description:
      "The living archive for Game of Inches — champions, standings, draft results, manual keeper history, transactions, and all-time records since 2023.",
    openGraph: {
      title: "Game of Inches",
      description:
        "Every inch counts. Drafts, keepers, transactions, and league history.",
      type: "website",
      images: [{ url: imageUrl, width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Game of Inches",
      description:
        "Every inch counts. Drafts, keepers, transactions, and league history.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
