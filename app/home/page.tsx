"use client"

import Link from "next/link"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src="/favicon-96x96.png"
            alt="stu. logo"
            width={32}
            height={32}
            className="rounded"
            priority
          />
          <h1 className="text-2xl font-bold">stu.</h1>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="max-w-2xl mx-auto text-center mb-12">
        <div className="bg-black text-white rounded-lg p-4 mb-6 inline-block">
          <div className="w-8 h-8 bg-white rounded text-black flex items-center justify-center text-lg mb-2 mx-auto">
            🎓
          </div>
          <h2 className="text-lg font-semibold mb-1">welcome to stu.</h2>
          <p className="text-sm text-gray-300">how can I help you today?</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="max-w-4xl mx-auto space-y-4">
        {/* First Card - Four-year graduation map */}
        <Link href="/dashboard/grad-plan">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Create a four-year graduation map
            </h3>
            <p className="text-gray-600 text-sm">
              that gives me my personalized path to finish when I want
            </p>
          </div>
        </Link>

        {/* Second Card - Connect with advisor */}
        <Link href="/dashboard/meet-with-advisor">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Help me connect with my advisor
            </h3>
            <p className="text-gray-600 text-sm">
              to discuss my academic goals and course planning
            </p>
          </div>
        </Link>

        {/* Third Card - Schedule for next semester */}
        <Link href="/dashboard/semester-scheduler">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Plan my schedule for next semester
            </h3>
            <p className="text-gray-600 text-sm">
              using my current four-year graduation plan
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}