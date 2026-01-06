// src/components/SiteFooter.tsx
import Link from "next/link"
import Image from "next/image"

export default function Footer() {
  return (
    <footer
      className="
        mt-12                 /* space above to separate from content */
        glass-effect          /* same translucent look as navbar */
        border-t border-border
      "
    >
      <div className="page-wrap py-5">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Left: logo + copyright */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/favicon.ico"
                alt="stu. logo"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="text-lg font-bold tracking-tight">stu.</span>
            </Link>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} stu. All rights reserved.
            </span>
          </div>

          {/* Right: simple nav */}
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/about" className="hover:text-primary">About</Link>
            <Link href="/contact" className="hover:text-primary">Contact</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
