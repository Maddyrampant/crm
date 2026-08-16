import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { DirectionProvider } from "@/components/ui/direction";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const vazirmatn = Vazirmatn({
  variable: "--font-sans",
  subsets: ["latin", "arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CRM — مدیریت ارتباط با مشتری",
    template: "%s | CRM",
  },
  description: "سیستم مدیریت ارتباط با مشتری — فارسی و راست‌چین",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRM",
  },
};

export const viewport: Viewport = {
  themeColor: "#7367F0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <body className="min-h-full bg-background font-sans antialiased">
        <DirectionProvider dir="rtl">
          <Providers>{children}</Providers>
          <Toaster richColors position="top-center" />
        </DirectionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
