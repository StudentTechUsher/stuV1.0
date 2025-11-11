/**
 * Structured Data (JSON-LD) for SEO
 *
 * These functions generate schema.org structured data to help search engines
 * better understand our content and display rich results in search.
 */

export interface StructuredDataProps {
  type: 'organization' | 'software' | 'faq' | 'breadcrumb';
  data?: Record<string, unknown>;
}

/**
 * Organization structured data
 * Used on home page and about page
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Stu',
    legalName: 'Stu Inc.',
    url: 'https://stuplanning.com',
    logo: 'https://stuplanning.com/favicon-96x96.png',
    description: 'Stu helps students graduate efficiently, gives advisors their time back, and equips administrators to plan smarter. Academic planning and forecasting software for universities.',
    foundingDate: '2023',
    founders: [
      {
        '@type': 'Person',
        name: 'Jarom Pratt',
        jobTitle: 'Co-founder & CEO',
        sameAs: 'https://www.linkedin.com/in/jarom-pratt/',
      },
      {
        '@type': 'Person',
        name: 'Vin (Matt) Jones',
        jobTitle: 'Co-founder & CTO',
        sameAs: 'https://www.linkedin.com/in/vin-matt-jones/',
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
    sameAs: [
      'https://www.linkedin.com/in/jarom-pratt/',
      'https://www.linkedin.com/in/vin-matt-jones/',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Sales',
      url: 'https://stuplanning.com/demo',
    },
  };
}

/**
 * SoftwareApplication structured data
 * Used on main landing page and product pages
 */
export function getSoftwareSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Stu',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Contact for institutional pricing',
    },
    description: 'Academic planning and forecasting software for universities. Automated graduation planning, semester scheduling, and course demand forecasting.',
    featureList: [
      'Automated graduation planning',
      'Semester scheduling',
      'Course demand forecasting',
      'Advisor collaboration tools',
      'Student progress tracking',
      'Institution-wide analytics',
    ],
    provider: {
      '@type': 'Organization',
      name: 'Stu Inc.',
      url: 'https://stuplanning.com',
    },
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: ['Student', 'Academic Advisor', 'Administrator'],
    },
  };
}

/**
 * FAQPage structured data
 * Can be used when we add an FAQ section
 */
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * BreadcrumbList structured data
 * Helps show navigation path in search results
 */
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Educational Organization schema
 * Can be used for university-specific pages
 */
export function getEducationalOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Stu',
    url: 'https://stuplanning.com',
    description: 'Academic planning platform serving universities and colleges',
    applicationCategory: 'EducationApplication',
    educationalUse: [
      'Academic Planning',
      'Degree Tracking',
      'Course Scheduling',
      'Graduation Forecasting',
    ],
  };
}

/**
 * WebSite schema with search action
 */
export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Stu',
    url: 'https://stuplanning.com',
    description: 'Academic planning and forecasting for universities',
    publisher: {
      '@type': 'Organization',
      name: 'Stu Inc.',
    },
  };
}
