import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopNav } from './_components/TopNav'
import { AuthGuard } from './_components/AuthGuard'

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
  title: "BIOT DL",
  description: "BIOT DL - Smart Lighting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthGuard>
          <div className="flex flex-col min-h-screen bg-gray-50">
            <TopNav />
            <main className="flex-1 flex flex-col min-h-0">{children}</main>
          </div>
        </AuthGuard>
      </body>
    </html>
  );
}
