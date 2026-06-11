import type { Metadata } from "next";
import { Inter, Lilita_One, Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/components/providers/Web3Provider";
import GlobalOverlays from "@/components/ui/GlobalOverlaysLoader";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lilitaOne = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-lilita",
  display: "swap",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-share-tech",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NormiesVerse",
  description: "A 3D adventure game where your Normie NFT is the universe.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lilitaOne.variable} ${shareTechMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#03040a] text-white">
        <Web3Provider>{children}</Web3Provider>
        <Footer />
        <GlobalOverlays />
      </body>
    </html>
  );
}
