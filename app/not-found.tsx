import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-6">
      <div className="text-center max-w-2xl">
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
          We couldn’t find that page
        </h1>
        <p className="mt-3 text-zinc-600">
          The link might be broken or the page may have moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex ml-2 items-center justify-center rounded-md bg-primary
                        px-12 py-6 font-medium text-foreground
                        ring-1 ring-primary/30 hover:brightness-95"
            >
            <ArrowLeftIcon className="mr-[20px]" />
            Go home
        </Link>
          <Image
            src="/confused_student_404.png"
            alt="404 illustration"
            width={400}
            height={300}
            className="mt-6"
          />
        </div>
      </div>
    </main>
  );
}
