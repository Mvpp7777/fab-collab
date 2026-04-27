import Link from "next/link";
import type { Metadata } from "next";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Collab It — Write it together. Get discovered. Get paid.",
  description:
    "The platform where creative teams, business teams, and innovators create together — with every contribution attributed, every turn accountable, and every completed project ready for the world.",
  openGraph: {
    title: "Collab It — Write it together. Get discovered. Get paid.",
    description:
      "The platform where creative teams, business teams, and innovators create together — with every contribution attributed, every turn accountable, and every completed project ready for the world.",
    type: "website",
  },
};

const FEATURES = [
  {
    emoji: "🎵",
    title: "Relay Mode",
    body: "Take turns writing. Each collaborator adds their part and passes the turn.",
  },
  {
    emoji: "🤖",
    title: "AI Assist",
    body: "Stuck? Get rhymes, rewrites, and creative unblocking from Claude AI instantly.",
  },
  {
    emoji: "🌍",
    title: "Get Ready to Be Discovered",
    body: "Your work is timestamped, attributed, and professionally presented the moment you complete it. Industry Scout portal opening Summer 2026.",
  },
  {
    emoji: "📹",
    title: "Face to Face",
    body: "Jump on a call with your collaborator instantly from inside the app.",
  },
  {
    emoji: "🏆",
    title: "Authorship Certificate",
    body: "Every contribution is timestamped and attributed. Prove you wrote it.",
  },
  {
    emoji: "💬",
    title: "Community Feedback",
    body: "Share with anyone for feedback. No account needed.",
  },
  {
    emoji: "💡",
    title: "Think Tank",
    body: "Develop ideas with your team and invite verified industry experts to contribute their real-world experience directly into your project.",
  },
];

const PROJECT_EMOJIS = ["🎵", "🎬", "📖", "✍️", "🎙️", "🏗️", "📊", "🎉", "💡"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Collab It home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-ocean/70">
            <Link href="/discover" className="hover:text-ocean">Discover</Link>
            <a href="#for-teams" className="hidden hover:text-ocean sm:inline">For teams</a>
            <Link href="/invest" className="hidden hover:text-ocean sm:inline">Invest</Link>
            <Link href="/experts" className="hidden hover:text-ocean sm:inline">Experts</Link>
            <Link href="/industry" className="hidden hover:text-ocean sm:inline">Industry</Link>
            <Link href="/auth/login" className="hover:text-ocean">Log in</Link>
            <ThemeToggle />
            <Link
              href="/auth/signup"
              style={{ backgroundColor: "#FF6B47", color: "white" }}
              className="rounded-full px-4 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
            >
              Sign up free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-ocean sm:text-6xl md:text-7xl">
          Write it together. <span className="text-lagoon">Get discovered.</span>{" "}
          Get paid.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-display text-lg text-ocean/70 sm:text-xl">
          The platform where creative teams, business teams, and innovators
          create together — with every contribution attributed, every turn
          accountable, and every completed project ready for the world.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-6 py-3 font-display text-base font-semibold shadow-lg transition hover:brightness-110 active:scale-95"
          >
            Start creating free →
          </Link>
          <a
            href="#features"
            className="rounded-full border border-ocean/15 bg-white px-6 py-3 font-display text-base font-medium text-ocean transition hover:bg-ocean hover:text-white"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold text-ocean sm:text-4xl">
          Everything you need to co-create
        </h2>
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="text-3xl" aria-hidden>
                {f.emoji}
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-ocean">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-ocean/70">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Project types */}
      <section className="mx-auto max-w-4xl px-6 py-12 text-center">
        <p className="font-display text-lg text-ocean/70 sm:text-xl">
          Join creators writing songs, screenplays, novels, business plans and
          more
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-4xl sm:gap-6 sm:text-5xl">
          {PROJECT_EMOJIS.map((e, i) => (
            <span key={i} aria-hidden>
              {e}
            </span>
          ))}
        </div>
      </section>

      {/* Think Tank */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="text-center">
          <div className="inline-block rounded-full bg-lagoon/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-lagoon">
            Think Tank — Where Ideas Meet Expertise
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-ocean sm:text-4xl">
            Got a big idea? Get expert input.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-ocean/70 sm:text-lg">
            Invite verified founders, investors, and industry veterans to
            contribute directly into your Think Tank project. They add their
            expertise. You keep moving forward.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-bold text-ocean">
              For teams with ideas
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-ocean/80">
              <li className="flex gap-2">
                <span className="text-lagoon">•</span>
                Develop your concept collaboratively
              </li>
              <li className="flex gap-2">
                <span className="text-lagoon">•</span>
                Invite experts to fill your knowledge gaps
              </li>
              <li className="flex gap-2">
                <span className="text-lagoon">•</span>
                Get feedback from people who have done it before
              </li>
              <li className="flex gap-2">
                <span className="text-lagoon">•</span>
                Open your project for investment when ready
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="font-display text-lg font-bold text-ocean">
              For experts
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-ocean/80">
              <li className="flex gap-2">
                <span className="text-coral">•</span>
                Share your knowledge and get paid
              </li>
              <li className="flex gap-2">
                <span className="text-coral">•</span>
                Set your own contribution rate
              </li>
              <li className="flex gap-2">
                <span className="text-coral">•</span>
                Work on your own schedule
              </li>
              <li className="flex gap-2">
                <span className="text-coral">•</span>
                Discover investment opportunities early
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/experts"
            style={{ backgroundColor: "#0BBFBF", color: "white" }}
            className="rounded-full px-5 py-2.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Apply as an expert →
          </Link>
          <Link
            href="/auth/signup"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-5 py-2.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Start a Think Tank →
          </Link>
        </div>
      </section>

      {/* For business teams */}
      <section id="for-teams" className="mx-auto max-w-5xl scroll-mt-24 px-6 py-20">
        <div className="text-center">
          <div className="inline-block rounded-full bg-ocean/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ocean/70">
            For business teams
          </div>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-ocean sm:text-4xl">
            Built for teams who create together
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-ocean/70 sm:text-lg">
            From marketing campaigns to legal documents to strategic plans —
            Collab It gives every contributor a clear role, a clear turn,
            and clear attribution.
          </p>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              emoji: "📣",
              title: "Marketing teams",
              body: "Co-write campaigns, briefs, and copy with your entire team. Know who wrote what and when.",
            },
            {
              emoji: "⚖️",
              title: "Legal & consulting",
              body: "Collaborate on documents with external parties. Every edit attributed. Every version timestamped.",
            },
            {
              emoji: "🚀",
              title: "Strategy & planning",
              body: "Run Think Tank sessions that capture every idea, every expert input, and every decision in one place.",
            },
          ].map((c) => (
            <li key={c.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="text-3xl" aria-hidden>
                {c.emoji}
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-ocean">
                {c.title}
              </h3>
              <p className="mt-2 text-sm text-ocean/70">{c.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="rounded-full px-5 py-2.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Start your team project →
          </Link>
          <a
            href="mailto:hello@collabit.com"
            className="rounded-full border border-ocean/15 bg-white px-5 py-2.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
          >
            Request a demo →
          </a>
        </div>
      </section>

      {/* Mission */}
      <section
        style={{ backgroundColor: "#1A2E2E" }}
        className="w-full px-6 py-24 text-center sm:py-28"
      >
        <div className="mx-auto max-w-3xl">
          <div className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-lagoon">
            Our Mission
          </div>
          <h2 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
            Built with purpose. Guided by something greater.
          </h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-5 font-display text-base leading-relaxed text-white/80 sm:text-lg">
            <p>
              Every feature built, every problem solved, every collaboration
              that comes to life here — we believe none of it happens without
              purpose and guidance.
            </p>
            <p>
              Collab It exists to bring people together — to create things
              that matter, tell stories that heal, build ideas that help, and
              connect people across distances and differences.
            </p>
            <p>
              For the songwriter who finds their co-writer. For the
              entrepreneur whose idea finds its expert. For the creator who
              gets discovered. For every collaborator who builds something
              they could not have created alone.
            </p>
            <p>Collab It is the bridge.</p>
          </div>
          <div
            aria-hidden
            className="mx-auto mt-12 h-px w-24"
            style={{ backgroundColor: "#0BBFBF" }}
          />
          <p
            style={{ color: "#0BBFBF" }}
            className="mt-8 font-display text-2xl italic sm:text-3xl"
          >
            All glory to God. Now go build something legendary.
          </p>
        </div>
      </section>

      {/* Industry CTA */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm sm:p-12">
          <h2 className="font-display text-3xl font-extrabold text-ocean sm:text-4xl">
            Industry professionals — get early access
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-ocean/70 sm:text-lg">
            Our Scout portal opens Summer 2026. Join 500+ agents, publishers, and labels already on the waitlist for first access to emerging talent.
          </p>
          <Link
            href="/industry"
            style={{ backgroundColor: "#0BBFBF", color: "white" }}
            className="mt-6 inline-block rounded-full px-6 py-3 font-display text-base font-semibold shadow transition hover:brightness-110 active:scale-95"
          >
            Join the Scout waitlist →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="font-display text-4xl font-extrabold text-ocean sm:text-5xl">
          Ready to create something legendary?
        </h2>
        <div className="mt-8">
          <Link
            href="/auth/signup"
            style={{ backgroundColor: "#FF6B47", color: "white" }}
            className="inline-block rounded-full px-8 py-4 font-display text-lg font-semibold shadow-lg transition hover:brightness-110 active:scale-95"
          >
            Start for free →
          </Link>
          <p className="mt-3 text-sm text-ocean/60">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ocean/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <Link href="/" aria-label="Collab It home">
            <span className="font-display text-xl font-extrabold tracking-tight">
              <span className="text-ocean">collab</span>
              <span className="text-lagoon">it</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-5 text-sm font-medium text-ocean/70">
            <Link href="/discover" className="hover:text-ocean">Discover</Link>
            <Link href="/invest" className="hover:text-ocean">Invest</Link>
            <Link href="/experts" className="hover:text-ocean">Experts</Link>
            <Link href="/industry" className="hover:text-ocean">Industry</Link>
            <Link href="/terms" className="hover:text-ocean">Terms</Link>
            <Link href="/privacy" className="hover:text-ocean">Privacy</Link>
          </nav>
          <p className="text-sm text-ocean/50">© 2026 Collab It™</p>
        </div>
      </footer>
    </div>
  );
}
