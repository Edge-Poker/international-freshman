import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="glass fixed inset-x-0 top-0 z-40">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
        <BrandLogo size="md" />
        <div className="hidden items-center gap-7 text-sm text-dim md:flex">
          <a href="#approach" className="hover:text-white">Approach</a>
          <a href="#curriculum" className="hover:text-white">Curriculum</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/login" className="text-sm text-dim hover:text-white">Log in</Link>
          <Link href="/signup">
            <Button className="whitespace-nowrap px-4 text-sm sm:px-5">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Start now</span>
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
