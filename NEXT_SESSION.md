# Next session priorities

## TOP PRIORITIES

### 1. Stripe setup (Step 0 from payment roadmap)
Install `stripe` and create `src/lib/stripe.ts` with a basic
checkout-session creator. Add env vars (both `.env.local` and Vercel):
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### 2. Name decision and rebranding
Review competing brand options; if a rebrand lands, sweep every
reference (wordmark, ™ notices, LICENSE file, legal pages, email
templates, `manifest.json`, sitemap/robots base URL, OG metadata).

### 3. Tip a Creator (first Stripe-backed feature)
Four quick amounts ($1 ☕, $3 🎵, $5 ⭐, $10 🏆) + custom on
`/feedback/[token]`. Creator split equally between collaborators.
Fab Collab takes 10%. Migration `019_tips.sql`. In-app notification
to collaborators on tip.

### 4. Buy a Turn
Per-section "Open for purchase" toggle (owner), prices $10/$25/$100/$500.
On the feedback page, purchasable sections show coral "Co-write this
section — $X" CTA. On success the buyer is added as a collaborator,
inserted into the turn queue, and credited on the authorship certificate.
Migration `020_turn_purchases.sql`. Fab Collab takes 10%.

### 5. Think Tank expert contribution payments
Once Stripe is live, wire a "Request this expert" button on expert
profiles that opens a checkout session for the expert's contribution
rate. Fab Collab takes 20%.

## Already shipped
- Invitations with email + shareable link
- Face to Face video dropdown (5 platforms)
- Notifications bell with unread count, type icons, and "View all" link
- Full notifications page at `/notifications` with grouped date buckets, pagination, mark-all-read
- Export to text, PDF, Word
- Collaborator colors and attribution
- Turn awareness (Your turn vs Name's turn)
- Pass turn with email notification
- Project completion flow with celebration modal
- Public gallery with privacy controls
- Industry waitlist page at `/industry`
- Authorship certificate PDF
- Comments on sections with threaded replies
- Public feedback link (`/feedback/[token]`) with OG/Twitter card metadata
- Distribution integration (DistroKid)
- Writing streaks on dashboard
- Landing page (hero, features, industry CTA, final CTA, footer)
- Terms of Service + Privacy Policy (with IP/DMCA/anti-scraping + Fab Collab™)
- First-time onboarding modal
- Influencer campaigns (`/campaign/new`, `/campaign/[slug]`, discover Live Campaigns, manage page)
- Think Tank project types + expert waitlist (`/experts`)
- LICENSE file + copyright notices
- Creative Commons license picker + badges on `/discover`
- Contribution timeline on `/discover/[id]`
- **Social sharing dropdown** (7 platforms + auto-teaser)
- **Dashboard improvements**: stats chips, sort/filter, "Continue where you left off"
- **Mobile responsiveness** fixes on project editor top bar
- **SEO metadata** on public pages + `robots.ts` + `sitemap.ts`
- **Error boundaries** on dashboard and project editor
