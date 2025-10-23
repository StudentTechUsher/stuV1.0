import { Metadata } from 'next'
import HowItWorksClient from './how-it-works-client'

export const metadata: Metadata = {
  title: 'How It Works - Academic Planning Made Simple',
  description: 'Learn how Stu simplifies academic planning for students and universities. Import your progress, plan your schedule, and stay on track to graduate on time. See how our platform works in 3 easy steps.',
  keywords: [
    'how academic planning works',
    'graduation planning process',
    'semester scheduling guide',
    'degree planning steps',
    'university planning software',
    'college planning tutorial'
  ],
  openGraph: {
    title: 'How Stu Works - Academic Planning Made Simple',
    description: 'Import your progress, plan your schedule, and stay on track to graduate on time. See how our platform works in 3 easy steps.',
    url: 'https://stuplanning.com/how-it-works',
    type: 'website',
  },
  alternates: {
    canonical: 'https://stuplanning.com/how-it-works',
  },
}

export default function HowItWorksPage() {
  return <HowItWorksClient />
}
