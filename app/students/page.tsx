import { Metadata } from 'next'
import StudentPageClient from './students-page-client'

export const metadata: Metadata = {
  title: 'For Students - Graduate On Time',
  description: 'Stu helps college students create personalized graduation plans and semester schedules in minutes. See exactly what courses you need, when to take them, and graduate on time with confidence.',
  keywords: [
    'graduation planning for students',
    'college course planner',
    'semester scheduler',
    'degree tracker',
    'graduation timeline',
    'college planning app',
    'academic planning students',
    'course schedule builder'
  ],
  openGraph: {
    title: 'Stu for Students - Graduate On Time',
    description: 'Create your personalized graduation plan in minutes. Track progress, schedule semesters, and graduate on time.',
    url: 'https://stuplanning.com/students',
    type: 'website',
  },
  alternates: {
    canonical: 'https://stuplanning.com/students',
  },
}

export default function StudentPage() {
  return <StudentPageClient />
}
