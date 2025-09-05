import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PrivyProvider from "./components/PrivyProvider";
import { Toaster } from "react-hot-toast";

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
    default: "PERPL KEEPER — Avoid the wind and grow Perpl.",
    template: "%s — PERPL KEEPER",
  },
  description:
    "Avoid the wind and grow Perpl, the bigger the flame, the better.",
  metadataBase: new URL("https://perpl-keeper.vercel.app/"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    url: "https://perpl-keeper.vercel.app/",
    siteName: "PERPL KEEPER",
    title: "PERPL KEEPER — Avoid the wind and grow Perpl.",
    description:
      "Avoid the wind and grow Perpl, the bigger the flame, the better.",
    images: [{ url: "/og.png" }], // /public/og.png
  },
  twitter: {
    card: "summary_large_image",
    title: "PERPL KEEPER — Avoid the wind and grow Perpl.",
    description:
      "Avoid the wind and grow Perpl, the bigger the flame, the better.",
    images: ["/og.png"], // /public/og.png
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
        <PrivyProvider>{children}</PrivyProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1f2937',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}
