"use client"

import Link from "next/link"
import Image from "next/image"

export default function HomePage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@700&family=Inter:wght@300;400;600&family=Work+Sans:wght@300;400;700&display=swap"
        rel="stylesheet"
      />

      <div className="min-h-screen bg-white px-6 py-8 flex flex-col items-center justify-center">

        {/* Top Left Links */}
        <>
          <a
            href="/students"
            className="absolute top-6 left-6 text-black text-4xl"
            style={{ fontFamily: 'Red Hat Display, sans-serif', fontWeight: 700 }}
          >
            stu.
          </a>

          <a
            href="/login"
            className="absolute top-[62px] left-6 text-[#12F987] text-base hover:text-[#06C96C]"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}
          >
            Login.
          </a>
        </>

        {/* Welcome box */}
        <div className="flex flex-col items-center text-center mb-10">
          <Image
            src="/stu_icon_black.png"
            alt="stu. logo"
            width={48}
            height={48}
            className="mb-2"
          />
          <h2
            className="text-center text-xl text-black mb-0"
            style={{ fontFamily: 'Work Sans, sans-serif', fontWeight: 700 }}
          >
            welcome to stu.
          </h2>
          <p
            className="text-zinc-700 text-sm"
            style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: '0.8rem' }}
          >
            how can I help you today?
          </p>
        </div>

        {/* Action Cards - 2x2 Grid */}
        <div className="w-[84%] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 font-['Work_Sans']">
          {/* Create a four-year graduation map */}
          <Link href="/dashboard/grad-plan">
            <div className="bg-white rounded-lg border border-[1px] border-zinc-300 px-12 py-7 min-h-[125px] hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="text-black text-lg mb-2" style={{ fontFamily: 'Work Sans, sans-serif', fontWeight: 700 }}>
                Create a four-year graduation map
              </h3>
              <p className="text-zinc-700 text-sm whitespace-nowrap">
                that gives me my personalized path to finish when I want
              </p>
            </div>
          </Link>

          {/* Help me choose a major */}
          <Link href="/dashboard/major-choice">
            <div className="bg-white rounded-lg border border-[1px] border-zinc-300 px-12 py-7 min-h-[125px] hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="text-black text-lg mb-2" style={{ fontFamily: 'Work Sans, sans-serif', fontWeight: 700 }}>
                Help me choose a major
              </h3>
              <p className="text-zinc-700 text-sm whitespace-nowrap">
                based on my preferences and previous coursework
              </p>
            </div>
          </Link>

          {/* Plan my schedule for next semester */}
          <Link href="/dashboard/semester-scheduler">
            <div className="bg-white rounded-lg border border-[1px] border-zinc-300 px-12 py-7 min-h-[125px] hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="text-black text-lg mb-2" style={{ fontFamily: 'Work Sans, sans-serif', fontWeight: 700 }}>
                Plan my schedule for next semester
              </h3>
              <p className="text-zinc-700 text-sm whitespace-nowrap">
                using my current four-year graduation plan
              </p>
            </div>
          </Link>

          {/* Connect with my advisor */}
          <Link href="/dashboard/meet-with-advisor">
            <div className="bg-white rounded-lg border border-[1px] border-zinc-300 px-12 py-7 min-h-[125px] hover:shadow-md transition-shadow cursor-pointer">
              <h3 className="text-black text-lg mb-2" style={{ fontFamily: 'Work Sans, sans-serif', fontWeight: 700 }}>
                Help me connect with my advisor
              </h3>
              <p className="text-zinc-700 text-sm whitespace-nowrap">
                to discuss my academic goals and course planning
              </p>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}
