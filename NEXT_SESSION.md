# Next session priorities

## TOP PRIORITIES

### 1. Stripe setup (Step 0 from payment roadmap)
Install `stripe` package and create `src/lib/stripe.ts` with a basic
checkout-session creator. Add env vars (both `.env.local` and Vercel):
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### 2. Tip a Creator
Four quick amounts ($1 ☕, $3 🎵, $5 ⭐, $10 🏆) + custom on
`/feedback/[token]`. Creator split equally between collaborators.
Fab Collab takes 10%. Migration `019_tips.sql`. In-app notification
to collaborators on tip.

### 3. Buy a Turn
Per-section "Open for purchase" toggle (owner), prices $10/$25/$100/$500.
On the feedback page, purchasable sections show coral "Co-write this
section — $X" CTA. On success the buyer is added as a collaborator,
inserted into the turn queue, and credited on the authorship certificate.
Migration `020_turn_purchases.sql`. Fab Collab takes 10%.

### 4. Think Tank expert contribution payments
Once Stripe is live, wire a "Request this expert" button on expert
profiles that opens a checkout session for the expert's contribution
rate. On payment the expert is added to the Think Tank as a collaborator
with a distinct "Expert" badge. Fab Collab takes 20%.

### 5. Name decision and rebranding if needed
Review competing brand options; if a rebrand lands, sweep every
reference (wordmark, ™ notices, emails, `manifest.json`, OG metadata,
LICENSE file, legal pages).

## Already shipped
- Invitations with email + shareable link
- Face to Face video dropdown (5 platforms)
- Notifications bell with unread count
- Export to text, PDF, Word
- Collaborator colors and attribution
- Turn awareness (Your turn vs Name's turn)
- Pass turn with email notification
- Project completion flow with celebration modal
- Public gallery with privacy controls
- Industry waitlist page at `/industry`
- Authorship certificate PDF
- Comments on sections with threaded replies
- Public feedback link (`/feedback/[token]`)
- Distribution integration (DistroKid)
- Writing streaks on dashboard
- Landing page (hero, features, industry CTA, final CTA, footer)
- Terms of Service + Privacy Policy
- First-time onboarding modal
- Influencer campaigns (`/campaign/new`, `/campaign/[slug]`, `/discover` Live Campaigns, manage page)
- Think Tank project types (4 new types + dedicated category)
- Expert marketplace waitlist (`/experts`) with Resend notification to `lenbenti@me.com`
- LICENSE file at repo root
- Copyright notice on public feedback pages
- Creative Commons license picker in completion modal + badge on `/discover`
- Contribution timeline on `/discover/[id]`
- Terms updated with IP / DMCA / anti-scraping / Fab Collab™ trademark clauses
