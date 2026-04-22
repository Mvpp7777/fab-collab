# Next session priorities

Previous priorities shipped:
- Invitations (Resend email + shareable link)
- Start a call (Face to Face dropdown with 5 platforms)
- Notifications bell with unread count + dropdown
- Export: plain text, PDF, Word
- Avatar color fix (self-heal missing owner collaborator row)
- UI polish: invite button renamed to "Add Collaborator"

## Open items for the next pass

1. **Live mode (real-time co-editing).** `projects.collab_mode = "live"` is persisted but behaves identically to relay. Use Supabase Realtime subscriptions on `content_snapshots` + presence for cursors.

2. **Role enforcement.** `commenter` and `viewer` roles exist but RLS doesn't block non-editor writes. Add policy variants keyed on `collaborators.role`.

3. **Comments thread on sections.** The `comments` table exists (section_id, user_id, parent_id, body, resolved); no UI yet. Slide-out panel from the right of each section.

4. **Contributions telemetry.** `contributions` table exists (char_delta, word_delta, action_type, ai_assisted) but nothing writes to it. Emit from `saveSection` server action.

5. **Avatar upload.** `users.avatar_url` is unused; add upload path via Supabase Storage and render on hover cards.

6. **Plans & billing.** `users.plan`, `ai_credits`, `stripe_customer_id` all unused — wire up Stripe Checkout for Pro/Studio.

7. **Auto-deploy from GitHub.** Currently deploy-on-push isn't configured — connect `Mvpp7777/fab-collab` in Vercel Settings → Git.
