import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const satoshi = localFont({
  src: "../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "huuman",
  description: "Your longevity coach. Because you deserve to be in your prime.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "huuman",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#09090b",
  viewportFit: "cover",
};

import { useCircadianTheme } from "@/lib/hooks/useCircadianTheme";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useCircadianTheme();
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${geistMono.variable} ${satoshi.variable} antialiased bg-surface-base text-text-primary`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-surface-overlay)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
            },
          }}
        />
      </body>
    </html>
  );
}
