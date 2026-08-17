import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { CurriculumGrid } from "@/components/landing/curriculum-grid";
import { Button } from "@/components/ui/button";
import { curso, allChapters } from "@/content/course";
import { Compass, Users, Briefcase, CalendarCheck, Check, User } from "lucide-react";

const pilares = [
  {
    icon: Compass,
    title: "The system, decoded",
    desc: "Nobody is going to save you here. Syllabi, choosing professors over classes, your own degree requirements, and why office hours are an advantage.",
  },
  {
    icon: Users,
    title: "A life outside class",
    desc: "You are who you're around. The information that never shows up in class, the comfortable circle going nowhere, and why being there is not enough.",
  },
  {
    icon: Briefcase,
    title: "Work and status",
    desc: "On-campus jobs and the SSN they unlock, the CPT mistake that erases your OPT, and why the best internships never come from a portal.",
  },
  {
    icon: CalendarCheck,
    title: "Written by someone ahead of you",
    desc: "A senior writing down what he figured out too late. Direct, specific, and honest about the parts that are genuinely hard.",
  },
];

const faq = [
  {
    q: "Do I need to be enrolled already?",
    a: "No. It works whether you are about to fly out, three weeks in, or already halfway through your first year. Start at the Introduction and skip whatever you have already solved.",
  },
  {
    q: "Is this immigration or legal advice?",
    a: "No. The chapters on CPT, OPT and campus employment explain how the system is structured and which questions to ask, but rules change and every case differs. Your Designated School Official and international student office are always the authority on your status.",
  },
  {
    q: "Is it only for students in the United States?",
    a: "The career and work-authorization chapters (CPT, OPT, on-campus jobs, the SSN) are US-focused. Everything on academics, friendships, money, time and mindset applies to studying abroad anywhere.",
  },
  {
    q: "How do I track what I have done?",
    a: "Every chapter has an automatic checklist, and the dashboard shows overall progress, time studied, your streak and your class rank — Freshman through Graduate.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-radial-accent">
      <Navbar />
      <main>
        {/* HERO */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-28 sm:px-5 sm:pb-24 sm:pt-36 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
              International Edition
            </p>
            <h1 className="mt-4 font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              The guide{" "}
              <span className="text-accent">no one gave you.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-dim">
              Twelve chapters on the first year nobody prepares you for: the academics,
              the friendships, the money, the visa clock and the career.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/signup"><Button className="px-7 py-3 text-base">Start now</Button></Link>
              <a href="#curriculum" className="text-sm text-dim underline-offset-4 hover:text-white hover:underline">
                See the full curriculum
              </a>
            </div>
            <div className="mt-10 flex gap-8 font-mono text-sm text-dim">
              <span><span className="text-white">{curso.length}</span> parts</span>
              <span><span className="text-white">12</span> chapters</span>
              <span><span className="text-white">4</span> exams</span>
            </div>
          </div>
          <CurriculumGrid />
        </section>

        {/* PILARES */}
        <section id="approach" className="mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">What it covers</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pilares.map((p) => (
              <div key={p.title} className="card p-6 transition-transform hover:-translate-y-1">
                <p.icon className="h-6 w-6 text-accent" />
                <h3 className="mt-4 font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-dim">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CURRICULO */}
        <section id="curriculum" className="mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">The full curriculum</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {curso.map((parte) => (
              <div key={parte.slug} className="card p-5 sm:p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-accent">{parte.title}</p>
                <h3 className="mt-1 text-xl font-bold">{parte.subtitle}</h3>
                <ul className="mt-4 space-y-2 text-sm text-dim">
                  {parte.chapters.slice(0, 5).map((c) => (
                    <li key={c.slug} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {c.title}
                    </li>
                  ))}
                  {parte.chapters.length > 5 && (
                    <li className="pl-6 font-mono text-xs">+ {parte.chapters.length - 5} chapters</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* DEPOIMENTOS — TODO: trocar pelos depoimentos reais antes do lancamento */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">
            From students who went first
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                quote:
                  "I spent a whole semester too intimidated to go to office hours, because nobody told me that was a normal thing students do. Chapter 3 would have saved me a full GPA point.",
                nome: "Ana L.",
                jornada: "Brazil → Boston",
              },
              {
                quote:
                  "The CPT and OPT chapter is the first explanation I have read that did not assume I already knew the vocabulary. I finally knew which questions to bring to my advisor.",
                nome: "Kwame O.",
                jornada: "Ghana → Chicago",
              },
              {
                quote:
                  "I had been living inside the international student bubble for a year without realizing it. The chapter on building a social circle is why I finally have friends here.",
                nome: "Mei T.",
                jornada: "Taiwan → Seattle",
              },
            ].map((d) => (
              <figure key={d.nome} className="card p-5 sm:p-6">
                <blockquote className="text-sm text-dim">“{d.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-700 text-dim">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="text-sm">
                    <span className="block font-semibold">{d.nome}</span>
                    <span className="font-mono text-xs text-accent">{d.jornada}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-6 font-mono text-[11px] text-dim">
            Illustrative examples — replace with real student testimonials before launch.
          </p>
        </section>

        {/* PLANOS */}
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-14 sm:px-5 sm:py-20">
          <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Plans</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { nome: "Free", preco: "$0", desc: "Introduction and Chapter 1, plus a limited dashboard.", destaque: false },
              { nome: "Monthly", preco: "$9/mo", desc: "Full guide, forum, notes and progress tracking.", destaque: false },
              { nome: "Yearly", preco: "$19/yr", desc: "Everything in monthly, plus priority on new features.", destaque: true },
              { nome: "Lifetime", preco: "$29", desc: "Permanent access, future updates included.", destaque: false },
            ].map((p) => (
              <div key={p.nome} className={`card p-8 ${p.destaque ? "border-accent/50 shadow-glow" : ""}`}>
                {p.destaque && (
                  <span className="mb-3 inline-block rounded-full bg-accent/10 px-3 py-1 font-mono text-xs text-accent">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{p.nome}</h3>
                <p className="mt-2 font-display text-3xl font-black sm:text-4xl">{p.preco}</p>
                <p className="mt-3 text-sm text-dim">{p.desc}</p>
                <Link href="/signup" className="mt-6 block">
                  <Button variant={p.destaque ? "primary" : "ghost"} className="w-full">Subscribe</Button>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl px-4 py-14 sm:px-5 sm:py-20">
          <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Frequently asked</h2>
          <div className="mt-8 space-y-3">
            {faq.map((f) => (
              <details key={f.q} className="card group p-5">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm text-dim">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
