// app/demo/demo-thanks.tsx

import Image from "next/image"
import Link from "next/link"

export default function DemoThanksPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-20 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="flex justify-center">
          <Image
            src="/stu_icon_black.png"
            alt="stu. logo"
            width={80}
            height={80}
            style={{ width: "auto", height: "3rem" }}
            priority
          />
        </div>
        <h1
          className="text-[clamp(2rem,4vw,3rem)] font-bold text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight font-header"
        >
          Thanks for reaching out!
        </h1>
        <p
          className="text-zinc-600 dark:text-zinc-400 text-lg sm:text-xl leading-snug font-body-medium"
        >
          Your demo request has been submitted successfully. We&apos;ll be in touch shortly to schedule a time.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-body-semi rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </main>
  )
}
