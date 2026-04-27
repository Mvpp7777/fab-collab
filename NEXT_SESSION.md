# Next session — current status

## Live
- **Production URL:** https://fabcollab.vercel.app
- **GitHub:** https://github.com/Mvpp7777/fab-collab
- **Latest commit on `master`:** `b8d9b7a` Add corporate teams section to landing page

## Stripe — connected, test mode
- `STRIPE_SECRET_KEY` (test) — set in `.env.local` and Vercel production
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test) — same
- `STRIPE_WEBHOOK_SECRET` (`whsec_…cYO5w`) — set in `.env.local` and Vercel production. Webhook endpoint `https://fabcollab.vercel.app/api/stripe/webhook` listens for `checkout.session.completed` + `payment_intent.succeeded`.
- Stripe SDK pinned to API version `2026-04-22.dahlia` in `src/lib/stripe.ts`.

## Already shipped (now live)

### Core writing + collaboration
- Auth (Supabase), project creation with 23 project types (creative + professional + Think Tank), section-based editor, autosave, content snapshots, contributions log, AI Assist (Claude — rhymes / rewrite / unblock / suggest)
- Relay turn system (`relay_state`), turn passing with email + in-app notification, turn awareness pills
- Invitations (email + shareable link), collaborator roles (editor / commenter / viewer), color attribution
- Comments (threaded, resolvable) with notifications
- Real-time updates via Supabase Realtime (section flashes in collaborator color, turn toasts)
- Face to Face video dropdown (5 platforms)

### Discovery + sharing
- Public feedback link `/feedback/[token]` with OG/Twitter card metadata
- Public gallery with privacy controls + license picker (CC variants)
- `/discover` (genre filter, title search) — banner announces Scout portal Summer 2026
- `/discover/[id]` with contribution timeline
- `/portfolio/[username]` (completed public projects)
- `/profile/[username]` (stats, badges, active campaigns, public projects) + `/profile/edit`
- Social sharing dropdown (7 platforms + auto-teaser)
- Authorship Certificate PDF
- Distribution integration (DistroKid)

### Engagement
- Notifications bell with unread count + `/notifications` page (grouped buckets, pagination, mark-all-read)
- Writing streaks on dashboard
- Badge system (10 badges) with notifications on earn
- Analytics panel on project editor (words by contributor, 30-day timeline, feedback, AI assists)
- Templates library (`/templates`)
- Influencer campaigns (`/campaign/new`, `/campaign/[slug]`, manage page, Live Campaigns on Discover)
- First-time onboarding modal + Getting Started checklist on dashboard
- Weekly email digest (respects `email_digest_enabled`)

### Stripe payments — all three flows live (commit `64a32bd`)
- **Tip a Creator** — quick-tip buttons + custom amount on `/feedback/[token]` → Stripe Checkout → `tips` table → all collaborators get an in-app "Someone tipped $X 🎉" notification
- **Unlock the Full Story** — first section free, rest blurred behind 🔒; Stripe Checkout at `projects.unlock_price_cents` (default $3) → `content_unlocks` row + `unlock_token` persisted in `localStorage` so the same browser stays unlocked on return visits
- **Buy a Turn** — owner toggles "Open for purchase" + price ($10/$25/$100/$500) on each section card; public CTA "✍️ Co-write this section — $X" on `/feedback/[token]` → Stripe Checkout → buyer added as collaborator (next `turn_order`, `editor` role) when signed in, owner notified either way
- 10% Fab Collab platform fee tracked as `platform_fee_cents` on every row
- Stripe webhook handler at `/api/stripe/webhook` verifies signatures and records the rows + fans out notifications

### Think Tank investment flow (commit `799ff49`)
- Owner-only "🦈 Open for Investment" toolbar button on completed Think Tank-type projects (`think_tank`, `community_challenge`, `research_collective`, `innovation_sprint`)
- Toggling on flips `projects.is_seeking_investment` + notifies every `users.is_verified_investor=true` user with "New Think Tank seeking investment: [Title]"
- Public `/invest` page — grid of seeking-investment Think Tanks with team size, brief, "Express Interest" CTA
- "Express Interest" — auth-gated; upserts `investment_interests` row, in-app notification to owner ("[Investor] from [Company] expressed interest…"), Resend email to investor with the owner's name + email
- "Verify as Investor" toggle on `/experts` — sets `users.is_verified_investor` + optional `users.investor_company`; opt-in for investment-opportunity notifications

### Landing + brand
- Landing page (hero, features, project types, Think Tank, **For business teams** (commit `b8d9b7a`), Industry CTA, final CTA, footer)
- Discovery messaging is honest about timeline ("Scout portal opening Summer 2026" everywhere — landing feature card, industry CTA, `/discover` banner, dashboard stat hint, completion modal toggle copy) — commit `870ad6c`
- Terms of Service + Privacy Policy (with IP/DMCA/anti-scraping, Fab Collab™)
- LICENSE file + copyright notices
- Dark mode toggle in header + CSS variable overrides
- SEO metadata on public pages + `robots.ts` + `sitemap.ts`
- Error boundaries on dashboard and project editor

### Admin
- `/admin` (users/projects/experts stats, expert approve/reject, waitlist CSV, digest trigger)
- Admin email hard-coded to `lenbenti@me.com`. `/admin` 404s otherwise.

## Migrations — full set (`supabase/migrations/`)

All 30 migrations exist in the repo. **001 through 027 are applied to Supabase.** **028, 029, 030 still need to run** — see priority #1 below.

| # | File | Adds |
|---|---|---|
| 001 | `001_initial_schema.sql` | core tables (users, projects, sections, snapshots, contributions, comments, notifications, invitations) + enums + updated_at trigger |
| 002 | `002_rls_policies.sql` | base RLS policies |
| 003 | `003_service_role_grants.sql` | service-role grants |
| 004 | `004_content_snapshots_policies.sql` | snapshot RLS |
| 005 | `005_notifications_policies.sql` | notifications RLS |
| 006 | `006_expand_project_types.sql` | extended project_type enum (creative + professional) |
| 007 | `007_invitations_and_collaborators.sql` | invitation/collab schema |
| 008 | `008_collaborator_access.sql` | collab access policies |
| 009 | `009_relay_state_and_colors.sql` | relay_state table + collaborator colors |
| 010 | `010_completion_and_public_gallery.sql` | `projects.status`, `completed_at`, `is_public` |
| 011 | `011_industry_waitlist.sql` | industry waitlist |
| 012 | `012_comments_policies.sql` | comments RLS |
| 013 | `013_feedback_tokens_and_submissions.sql` | `projects.feedback_token` + `feedback_submissions` |
| 014 | `014_distribution_clicks.sql` | distribution click log |
| 015 | `015_campaigns.sql` | campaigns + participants |
| 016 | `016_think_tank_types.sql` | Think Tank project_type values |
| 017 | `017_expert_applications.sql` | expert waitlist |
| 018 | `018_project_license.sql` | `projects.license` |
| 019 | `019_user_profiles.sql` | `users.username`, `users.bio`, realtime publications |
| 020 | `020_templates.sql` | `templates` |
| 021 | `021_badges.sql` | `user_badges` |
| 022 | `022_analytics.sql` | `feedback_page_views`, `ai_assist_usage` |
| 023 | `023_email_preferences.sql` | `users.email_digest_enabled` |
| 024 | `024_project_genre.sql` | `projects.genre` |
| 025 | `025_tips.sql` | `tips` (Stripe-backed) |
| 026 | `026_content_unlocks.sql` | `content_unlocks` + `projects.unlock_price_cents` |
| 027 | `027_turn_purchases.sql` | `turn_purchases` + `sections.purchasable` + `sections.purchase_price_cents` |
| **028** | `028_investment_flag.sql` | **`projects.is_seeking_investment`, `seeking_investment_at`** |
| **029** | `029_investment_interests.sql` | **`investment_interests` table** |
| **030** | `030_investor_flag.sql` | **`users.is_verified_investor`, `investor_company`, `investor_verified_at`** |

A combined idempotent file for 028–030 lives at `/tmp/invest_migrations.sql` (regeneratable any time). Migrations 019–024 are bundled at `/tmp/new_migrations.sql` and 025–027 at `/tmp/payment_migrations.sql`.

## Next priorities

1. **Run migrations 028, 029, 030 in Supabase SQL Editor.** The `/invest` page, "Open for Investment" toolbar button, and "Verify as Investor" toggle on `/experts` are all live in code but will throw on missing columns until these run. Combined idempotent file: `/tmp/invest_migrations.sql`.
2. **Test Stripe payments with `4242 4242 4242 4242`** (any future expiry, any CVC). Validate the three flows on a real `/feedback/[token]`:
   - Tip — pick $3, complete checkout, confirm green banner + tip row in DB + collaborator notifications
   - Unlock — open in a fresh browser/private window, click "Unlock the full…", confirm sections 2+ unblur after redirect and stay unblurred on refresh (localStorage token replay)
   - Buy a Turn — flip a section to "Open for purchase" $10, complete checkout from the public link, confirm owner notification + (when buyer is signed in) the buyer is added as a collaborator
3. **Switch Stripe to live mode when ready.** Replace the four env vars (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) in both `.env.local` and Vercel production with their live counterparts; recreate the webhook endpoint in the Stripe live-mode dashboard.
4. **Name decision** — top candidates: **Fabulist**, **Fabrica**, **Relay**. If a rebrand lands, sweep every reference (wordmark, ™ notices, LICENSE, legal pages, email templates, `manifest.json`, sitemap/robots base URL, OG metadata, hero copy, footer copyright).
5. **NSAI (Nashville Songwriters Association International) outreach** — first songwriter community to seed Tip + Unlock flows.
6. **Product Hunt launch preparation** — assets, hunter, gallery, first-day plan.
7. **Termly.io for Terms of Service** — replace the hand-rolled `/terms` and `/privacy` with Termly-generated, lawyer-reviewed copies (still keeping the IP/DMCA/anti-scraping clauses as overrides).
8. **DMCA agent registration at copyright.gov ($6)** — required for safe harbor under DMCA §512. Three-year cycle.

## Reference

- Admin email: `lenbenti@me.com`
- Resend FROM email: `process.env.RESEND_FROM_EMAIL` (default `onboarding@resend.dev`)
- Anthropic model in use for AI Assist: `claude-sonnet-4-6`
- Stripe SDK version: 22.1.0, API version `2026-04-22.dahlia`
- Next.js: 14.2.35, App Router
