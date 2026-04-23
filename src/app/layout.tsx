import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import styles from './layout.module.css';
import Sidebar from "@/components/Sidebar";
import Player from "@/components/Player";
import Navbar from "@/components/Navbar";
import AuthOverlay from "@/components/AuthOverlay";
import AudiomackManager from "@/components/AudiomackManager";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SonicStream | Experience Pure Audio",
  description: "High-fidelity music streaming for true audiophiles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        {/* <AuthOverlay /> */}
        <div className={styles.container}>
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
