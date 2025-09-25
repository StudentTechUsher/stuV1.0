// app/demo/demo-thanks.tsx

import Image from "next/image"

export default function DemoThanksPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-20 bg-white">
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
          className="text-[clamp(2rem,4vw,3rem)] font-bold text-black leading-tight tracking-tight font-header"
        >
          Thanks for reaching out!
        </h1>
        <p
          className="text-zinc-600 text-lg sm:text-xl leading-snug font-body-medium"
        >
          Your demo request has been submitted successfully. We'll be in touch shortly to schedule a time.
        </p>
      </div>
    </main>
  )
}
