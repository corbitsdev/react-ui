import type { Metadata } from "next";
import { Red_Hat_Display, Space_Mono } from "next/font/google";

import "./globals.css";

const redHatDisplay = Red_Hat_Display({ subsets: ["latin"], variable: "--font-red-hat-display" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono" });

export const metadata: Metadata = {
  title: "@corbits/react-ui",
  description: "The Corbits shadcn registry.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${redHatDisplay.variable} ${spaceMono.variable}`}>{children}</body>
    </html>
  );
}
