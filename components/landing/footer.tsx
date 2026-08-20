import { BRAND } from "@/components/brand-logo";
import { SUPPORT_EMAIL } from "@/lib/support";

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 sm:px-5 md:flex-row">
        <div>
          <p className="font-display text-lg font-black">
            {BRAND}<span className="text-accent">.</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-dim">
            The manual for your first year abroad: academics, campus life, money and career.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-2 text-dim">
            <span className="mb-1 font-mono text-xs uppercase tracking-widest text-white">Platform</span>
            <a href="#curriculum" className="hover:text-accent">Curriculum</a>
            <a href="#pricing" className="hover:text-accent">Pricing</a>
            <a href="/login" className="hover:text-accent">Log in</a>
          </div>
          <div className="flex flex-col gap-2 text-dim">
            <span className="mb-1 font-mono text-xs uppercase tracking-widest text-white">Contact</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all hover:text-accent">
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div className="flex flex-col gap-2 text-dim">
            <span className="mb-1 font-mono text-xs uppercase tracking-widest text-white">Legal</span>
            <a href="#" className="hover:text-accent">Terms of use</a>
            <a href="#" className="hover:text-accent">Privacy</a>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl px-4 text-xs text-dim sm:px-5">
        Educational material only. Nothing here is legal or immigration advice. Visa,
        status and work-authorization rules change and vary by case. Always confirm with your
        Designated School Official or international student office before acting.
      </p>
    </footer>
  );
}
