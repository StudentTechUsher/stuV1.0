import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next"
import localFont from "next/font/local";
import "./globals.css";
import { UniversityThemeProvider } from "@/contexts/university-theme-context";

const geistSans = localFont({
  src: [
    {
      path: "./fonts/Geist-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
  ],
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: [
    {
      path: "./fonts/GeistMono-Variable.woff2",
      style: "normal",
      weight: "100 900",
    },
  ],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://stuplanning.com'),
  title: {
    default: 'Stu - Academic Planning & Forecasting for Universities',
    template: '%s | Stu'
  },
  description: 'Stu helps students graduate efficiently, gives advisors their time back, and equips administrators to plan smarter. Automated graduation planning, forecasting, and semester scheduling for colleges and universities.',
  keywords: [
    'academic planning software',
    'university planning',
    'college planning',
    'graduation planning',
    'degree planning tool',
    'academic forecasting',
    'student success platform',
    'advisor scheduling',
    'semester scheduler',
    'university forecasting',
    'academic advisor software',
    'graduation tracker',
    'course planning'
  ],
  authors: [{ name: 'Stu Inc.' }],
  creator: 'Stu Inc.',
  publisher: 'Stu Inc.',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon-96x96.png',
    apple: '/favicon-96x96.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://stuplanning.com',
    siteName: 'Stu',
    title: 'Stu - Academic Planning & Forecasting for Universities',
    description: 'Automated graduation planning, forecasting, and semester scheduling for colleges and universities. Help students graduate efficiently while giving advisors their time back.',
    images: [
      {
        url: '/favicon-96x96.png',
        width: 96,
        height: 96,
        alt: 'Stu Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stu - Academic Planning & Forecasting for Universities',
    description: 'Automated graduation planning, forecasting, and semester scheduling for colleges and universities.',
    images: ['/favicon-96x96.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add Google Search Console verification when available
    // google: 'your-verification-code',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-9JYQT7RKJ7"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-9JYQT7RKJ7');
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <UniversityThemeProvider>
          {children}
        </UniversityThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
