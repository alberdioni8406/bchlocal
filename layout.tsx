import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { TopNav } from "@/components/TopNav";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "BCH Local — Buy. Sell. Get paid. In Bitcoin Cash.",
    template: "%s | BCH Local",
  },
  description:
    "A simple marketplace for real people, real goods and real services. Find products, services and opportunities near you. Pay directly with Bitcoin Cash.",
  openGraph: {
    type: "website",
    locale: "pt_MZ",
    siteName: "BCH Local",
    title: "BCH Local — Buy. Sell. Get paid. In Bitcoin Cash.",
    description:
      "A simple marketplace for real people, real goods and real services.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BCH Local",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <Providers>
          <TopNav />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
