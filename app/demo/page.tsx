import { Metadata } from 'next'
import DemoPageClient from './demo-page-client'

export const metadata: Metadata = {
  title: 'Request a Demo - See Stu in Action',
  description: 'Request a personalized demo of Stu\'s academic planning and forecasting platform. See how we help universities improve graduation rates, reduce advisor workload, and forecast course demand with precision.',
  keywords: [
    'academic planning demo',
    'university software demo',
    'graduation planning demo',
    'forecasting software demo',
    'advisor tools demo',
    'student success platform demo'
  ],
  openGraph: {
    title: 'Request a Demo - See Stu in Action',
    description: 'See how Stu transforms academic planning at your university. Request a personalized demo today.',
    url: 'https://stuplanning.com/demo',
    type: 'website',
  },
  alternates: {
    canonical: 'https://stuplanning.com/demo',
  },
}

export default function DemoPage() {
  return <DemoPageClient />
}
