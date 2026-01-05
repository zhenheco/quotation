import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./prevent-overscroll.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  title: "報價單系統",
  description: "專業報價單管理系統",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "報價單",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon-180x180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
