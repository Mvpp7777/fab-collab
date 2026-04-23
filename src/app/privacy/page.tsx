import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Fab Collab",
};

export default function PrivacyPage() {
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
            href="/terms"
            className="text-sm font-medium text-ocean/70 hover:text-ocean"
          >
            Terms of Service →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-4xl font-extrabold text-ocean sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ocean/50">Last updated: April 2026</p>

        <article className="prose mt-8 max-w-none space-y-6 text-ocean">
          <Section title="1. Data we collect">
            When you use Fab Collab we collect the minimum needed to run the
            service: your email address, a display name you choose, and the
            content you create inside projects (sections, comments, AI-assist
            requests, feedback submissions). We also store standard metadata
            like timestamps and your last sign-in.
          </Section>

          <Section title="2. How we use it">
            We use your data only to run Fab Collab: authenticate you, render
            your projects to collaborators, send email notifications you asked
            for (invitations, &ldquo;your turn&rdquo; emails, etc.), and make
            product improvements. We do not sell your data, and we do not run
            third-party advertising on the service.
          </Section>

          <Section title="3. Third-party services">
            Running Fab Collab requires a small set of trusted subprocessors.
            Each one only sees the data needed to do its job:
            <ul className="mt-2 list-disc pl-5 text-ocean/80">
              <li>
                <strong>Supabase</strong> — authentication, database, file
                storage.
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery
                (invites, turn notifications).
              </li>
              <li>
                <strong>Anthropic</strong> — AI writing suggestions (section
                text is sent when you ask for Rhymes, Rewrite, or Unblock).
              </li>
              <li>
                <strong>Vercel</strong> — hosting and server-side runtime.
              </li>
            </ul>
          </Section>

          <Section title="4. We do not sell your data">
            Fab Collab does not and will not sell personal data to advertisers,
            data brokers, or training pipelines. Content you create is yours —
            see our Terms for details on ownership.
          </Section>

          <Section title="5. Public content">
            By default, every project is private. Content becomes visible to
            others only when you explicitly share it — by inviting a
            collaborator, generating a feedback link, or marking a completed
            project for the public gallery. Public content may be cached by
            search engines once made public.
          </Section>

          <Section title="6. Your rights">
            You can export your content or request deletion of your account at
            any time by emailing us. On deletion we remove your account and
            project data within 30 days, except where retention is required by
            law (e.g., billing records) or to prevent fraud.
          </Section>

          <Section title="7. Cookies">
            We use only essential cookies — notably the session cookie that
            keeps you signed in. We do not use third-party tracking cookies.
          </Section>

          <Section title="8. Children">
            Fab Collab is not intended for children under 13 (or 16 in the
            EU/UK). We do not knowingly collect personal data from children
            below that age.
          </Section>

          <Section title="9. Changes to this policy">
            If we materially change how we use your data, we&rsquo;ll announce
            it in-app or by email before the change takes effect.
          </Section>

          <Section title="10. Contact">
            Data requests, questions, or concerns? Email{" "}
            <a
              href="mailto:privacy@fabcollab.com"
              className="font-medium text-lagoon hover:underline"
            >
              privacy@fabcollab.com
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
      <div className="mt-2 text-base leading-relaxed text-ocean/80">
        {children}
      </div>
    </section>
  );
}
