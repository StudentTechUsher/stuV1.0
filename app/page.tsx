import { UnifiedLandingClient } from './unified-landing-client-publishable'
import { Metadata } from 'next'
import { getOrganizationSchema, getSoftwareSchema, getWebsiteSchema } from '@/lib/seo/structured-data'

export const metadata: Metadata = {
  title: 'STU | Academic Planning Platform for Universities',
  description: 'Enterprise planning for provosts, registrars, and CIOs. Reduce time-to-degree, improve retention, and simplify advising with policy-aligned pathways and demand-aware scheduling.',
  keywords: [
    'academic planning platform',
    'university retention software',
    'degree audit automation',
    'course demand forecasting',
    'advising workflow',
    'time to degree reduction',
    'student success for registrars',
    'higher ed scheduling',
    'degree planning for universities',
    'university enrollment analytics'
  ],
  openGraph: {
    title: 'STU — Academic Planning for Universities',
    description: 'Map the fastest, policy-aligned path to graduation for every student while giving leaders visibility into demand and risk.',
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
      <UnifiedLandingClient />
    </>
  )
}
