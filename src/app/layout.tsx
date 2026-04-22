import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SonicStream | Premium Music Experience",
  description: "Cross-platform high-fidelity music and podcast streaming.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Navbar />
            <div className="content-area">
              {children}
            </div>
          </main>
          <Player />
        </div>
      </body>
    </html>
  );
}
