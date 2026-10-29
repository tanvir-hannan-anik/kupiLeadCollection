import type { Metadata } from "next";
import { Anek_Bangla, Baloo_Da_2, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const baloo = Baloo_Da_2({
  variable: "--font-baloo",
  subsets: ["latin", "bengali"],
  weight: ["600", "700", "800"],
});

const anek = Anek_Bangla({
  variable: "--font-anek",
  subsets: ["latin", "bengali"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Let's Get in Touch — Kupi",
  description:
    "Interested in Kupi's products or services? Share your details and our team will get back to you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${anek.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
