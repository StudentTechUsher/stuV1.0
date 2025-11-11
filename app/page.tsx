import { LandingPageClient } from './landing-page-client'
import { Metadata } from 'next'
import { getOrganizationSchema, getSoftwareSchema, getWebsiteSchema } from '@/lib/seo/structured-data'

export const metadata: Metadata = {
  title: 'Academic Planning & Forecasting for Universities',
  description: 'Stu automates graduation planning and semester scheduling for universities. Help students graduate on time, give advisors their time back, and forecast course demand with precision. Enterprise-grade planning at a fraction of the cost.',
  keywords: [
    'academic planning',
    'university forecasting',
    'graduation planning software',
    'semester scheduler',
    'course demand forecasting',
    'advisor tools',
    'degree planning',
    'student success platform'
  ],
  openGraph: {
    title: 'Stu - Academic Planning & Forecasting for Universities',
    description: 'Automated graduation planning, forecasting, and semester scheduling. Help students graduate on time while giving advisors their time back.',
    url: 'https://stuplanning.com',
    type: 'website',
  },
  alternates: {
    canonical: 'https://stuplanning.com',
  },
}

export default function LandingPage() {
  const organizationSchema = getOrganizationSchema();
  const softwareSchema = getSoftwareSchema();
  const websiteSchema = getWebsiteSchema();

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <LandingPageClient />
    </>
  )
}