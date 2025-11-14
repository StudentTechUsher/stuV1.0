import { UnifiedLandingClient } from './unified-landing-client'
import { Metadata } from 'next'
import { getOrganizationSchema, getSoftwareSchema, getWebsiteSchema } from '@/lib/seo/structured-data'

export const metadata: Metadata = {
  title: 'Academic Planning & Course Scheduling for Students & Universities',
  description: 'Stu helps students graduate on time and universities optimize course planning. Intelligent scheduling, degree mapping, and analytics for academic success.',
  keywords: [
    'academic planning',
    'university forecasting',
    'graduation planning software',
    'semester scheduler',
    'course demand forecasting',
    'advisor tools',
    'degree planning',
    'student success platform',
    'college course planner',
    'degree tracker'
  ],
  openGraph: {
    title: 'Stu - Academic Planning for Students & Universities',
    description: 'Intelligent course scheduling and graduation planning. Help students graduate on time while giving advisors and universities powerful planning tools.',
    url: 'https://stuplanning.com/landing',
    type: 'website',
  },
  alternates: {
    canonical: 'https://stuplanning.com/landing',
  },
}

export default function UnifiedLandingPage() {
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
      <UnifiedLandingClient />
    </>
  )
}
