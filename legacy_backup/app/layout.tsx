import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./prevent-overscroll.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quotation System | 報價單系統",
  description: "Multi-currency quotation system with bilingual support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{
        overscrollBehavior: 'none',
        overflowX: 'hidden',
        height: '100%'
      }}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          overscrollBehavior: 'none',
          overflowX: 'hidden',
          minHeight: '100vh',
          position: 'relative'
        }}
      >
        {children}
      </body>
    </html>
  );
}
