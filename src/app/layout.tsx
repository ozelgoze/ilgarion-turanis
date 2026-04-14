import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "UEE ATAK — Star Citizen Party Finder & Tactical Ops",
  description:
    "Find squads for Star Citizen missions. Real-time LFG party finder, tactical map overlays, and briefing systems for Star Citizen organizations.",
  openGraph: {
    title: "UEE ATAK — Star Citizen Party Finder",
    description: "Find your squad. Real-time LFG for the 'verse.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="h-full bg-bg-primary text-text-primary antialiased relative overflow-x-hidden">
        {children}

        {/* Community Stamp */}
        <div className="fixed bottom-8 right-8 z-[100] pointer-events-none select-none group">
          <div className="relative">
            <Image
              src="/MadeByTheCommunity_White.png"
              alt="Made by the Community"
              width={100}
              height={100}
              className="opacity-20 transition-all duration-700 blur-[0.5px] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] grayscale hover:opacity-100 hover:blur-0 hover:grayscale-0 hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] pointer-events-auto cursor-help"
              priority
            />
            {/* Subtle glow pulse */}
            <div className="absolute inset-0 bg-white/5 rounded-full animate-pulse-slow -z-10 blur-xl"></div>
          </div>
        </div>
      </body>
    </html>
  );
}
