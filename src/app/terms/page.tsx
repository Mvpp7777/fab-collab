import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Fab Collab",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-foam">
      <header className="border-b border-ocean/10 bg-foam/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Fab Collab home">
            <span className="font-display text-2xl font-extrabold tracking-tight">
              <span className="text-ocean">fab</span>
              <span className="text-lagoon">collab</span>
            </span>
          </Link>
          <Link
            href="/privacy"
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            Privacy Policy →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-4xl font-extrabold text-ocean sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-ocean/50">Last updated: April 2026</p>

        <article className="prose mt-8 max-w-none space-y-6 text-ocean">
          <Section title="1. What Fab Collab is">
            Fab Collab is a collaborative creative-writing platform. Users
            create projects (songs, screenplays, novels, business documents,
            and more), invite collaborators, take turns writing, and optionally
            publish completed work to a public gallery. Fab Collab also
            provides AI writing assistance and optional discovery by industry
            professionals.
          </Section>

          <Section title="2. Your account">
            You must be at least 13 years old (16 in the EU/UK) to create an
            account. You&rsquo;re responsible for the activity under your
            account, for keeping your password secure, and for providing an
            accurate email so we can contact you about your account.
          </Section>

          <Section title="3. Content ownership">
            You retain all ownership and intellectual-property rights in the
            content you create on Fab Collab. Co-written projects are jointly
            owned by the contributors in a manner determined by those
            contributors — Fab Collab does not claim any share of ownership.
          </Section>

          <Section title="4. License you grant us">
            You grant Fab Collab a limited, worldwide, royalty-free license to
            store, reproduce, display, and transmit your content solely to
            operate and improve the service — for example, to render your
            project to collaborators, to email notifications, and to display
            content you have marked public. This license ends when you delete
            the content, except as needed for legal compliance, backups, or
            fraud prevention.
          </Section>

          <Section title="5. Prohibited use">
            Don&rsquo;t use Fab Collab to: upload content you don&rsquo;t have
            the right to share; harass, threaten, or deceive others; infringe
            copyright or trademarks; upload malicious code; attempt to breach
            the platform&rsquo;s security or rate-limiting; scrape or resell
            Fab Collab content without permission.
          </Section>

          <Section title="6. AI assistance">
            AI-generated suggestions (via Anthropic&rsquo;s Claude) are provided
            as a tool to assist your writing. You remain responsible for the
            final content you publish. AI output may be imperfect or repetitive
            and should be reviewed before use.
          </Section>

          <Section title="7. Termination">
            You can delete your account at any time. We may suspend or
            terminate accounts that violate these terms, with or without
            notice.
          </Section>

          <Section title="8. No warranty / limitation of liability">
            Fab Collab is provided &ldquo;as is,&rdquo; without warranty of any
            kind, express or implied. To the extent permitted by law, Fab
            Collab&rsquo;s total liability for any claim relating to the
            service will not exceed the greater of the amount you paid us in
            the prior 12 months or one hundred US dollars.
          </Section>

          <Section title="9. Changes to these terms">
            We may update these terms from time to time. Material changes will
            be announced in-app or by email. Continued use of Fab Collab after
            the effective date of changes means you accept the new terms.
          </Section>

          <Section title="10. Governing law">
            These terms are governed by the laws of the jurisdiction in which
            Fab Collab is incorporated, without regard to conflict-of-laws
            principles. Disputes will be resolved in the courts of that
            jurisdiction.
          </Section>

          <Section title="11. Contact">
            Questions about these terms? Email{" "}
            <a
              href="mailto:support@fabcollab.com"
              className="font-medium text-lagoon hover:underline"
            >
              support@fabcollab.com
            </a>
            .
          </Section>
        </article>

        <div className="mt-12">
          <Link
            href="/"
            className="text-sm font-medium text-lagoon hover:underline"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-ocean">{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-ocean/80">{children}</p>
    </section>
  );
}
