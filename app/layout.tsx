import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DevAuthToggle from '@/components/dev/dev-auth-toggle';
import { UniversityThemeProvider } from "@/contexts/university-theme-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "stu.",
  description: "welcome to stu.",
  icons: {
    icon: '/favicon-96x96.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UniversityThemeProvider>
          {children}
          <DevAuthToggle />
        </UniversityThemeProvider>
      </body>
    </html>
  );
}
