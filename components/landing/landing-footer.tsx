import Image from "next/image"
import Link from "next/link"

export type LandingFooterProps = {
  logoSrc?: string
  logoAlt?: string
  logoHref?: string
  year?: number
  privacyHref?: string
  securityHref?: string
  contactHref?: string
}

export function LandingFooter({
  logoSrc = "/favicon-96x96.png",
  logoAlt = "stu. logo",
  logoHref = "/",
  year = new Date().getFullYear(),
  privacyHref = "/privacy-policy",
  securityHref = "/security",
  contactHref = "mailto:hello@stuplanning.com",
}: LandingFooterProps) {
  return (
    <footer id="footer" className="border-t-2 border-border/60 bg-white py-12 md:py-16">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-8">
        <div className="flex items-center gap-2 font-bold text-2xl text-foreground">
          <Image src={logoSrc} alt={logoAlt} width={32} height={32} className="rounded-md" />
          <span>stu.</span>
        </div>
        <div className="flex items-center gap-6 text-base text-muted-foreground">
          <Link href={privacyHref} className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href={securityHref} className="hover:text-foreground transition-colors">
            Security
          </Link>
          <Link href={contactHref} className="hover:text-foreground transition-colors">
            Contact
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">© {year} Stu. All rights reserved.</p>
      </div>
    </footer>
  )
}
