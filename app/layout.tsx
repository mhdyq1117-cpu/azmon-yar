import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SiteFooter } from "@/components/app/site-footer";

const vazirmatn = localFont({
  src: "./fonts/Vazirmatn-Variable.woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "آزمون‌ساز آنلاین | ساخت آزمون آنلاین مدرن برای معلمان",
  description:
    "پلتفرم مدرن ساخت آزمون آنلاین؛ معلمان آزمون بسازند، لینک را برای دانش‌آموزان بفرستند و نتایج را با تصحیح خودکار ببینند.",
  keywords: ["آزمون آنلاین", "آزمون‌ساز", "معلم", "دانش‌آموز", "آزمون ریاضی", "بوم دست‌نویس"],
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
