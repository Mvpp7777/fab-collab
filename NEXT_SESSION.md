# Next session priorities

## PRIORITY NEXT — Payment Features (do Stripe first)

### Step 0 — Stripe setup (do this before any payment feature)
Install stripe npm package and create src/lib/stripe.ts with 
a basic checkout session creator. Add these env vars:
- STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY  
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET (for payment confirmations)

Also add to Vercel environment variables.

### Step 1 — Tip a Creator
Add to the public feedback page at /feedback/[token]:
- "Support this project" section below the feedback form
- Four quick tip buttons: $1 ☕, $3 🎵, $5 ⭐, $10 🏆
- Plus a custom amount field
- "Support the creators" coral button
- Stripe checkout opens in a modal or redirect
- On success: "Thank you for supporting this project! 
  You helped make something great. 🎉"
- Tips split equally between all collaborators
- Fab Collab takes 10% platform fee
- Store in new table: tips 
  (id, project_id, tipper_name, tipper_email, amount, 
  stripe_payment_id, created_at)
- Collaborators get notification: 
  "[Name or 'Someone'] tipped $[X] on [Project]! 🎉"
- Create migration 015_tips.sql

### Step 2 — Unlock the Full Story
On the public feedback page:
- Show only the first section content for free
- All other sections blurred/hidden with lock icon
- "Unlock the full [song/screenplay/story] for $[price]" 
  button in coral
- Creator sets unlock price (default $3) in project settings
- After Stripe payment, full content unlocks for that 
  browser session (store unlock token in localStorage)
- Add unlock_price column to projects table
- Store in new table: content_unlocks
  (id, project_id, email, stripe_payment_id, 
  unlock_token, created_at)
- Fab Collab takes 10%
- Create migration 016_content_unlocks.sql

### Step 3 — Buy a Turn
On the project editor (owner view):
- Each section card has a "Open for purchase" toggle
- When toggled on, owner sets price: $10/$25/$100/$500
- Section shows "Available to co-write" badge in teal
- On the feedback page, purchasable sections show:
  "✍️ Co-write this section — $25" coral button
- Stripe checkout
- On success:
  * User added as collaborator with editor role
  * Added to relay queue for that specific section
  * Authorship certificate generated on completion
  * Notification to owner: "[Name] purchased a turn 
    on [Section] in [Project]!"
- Add purchasable and purchase_price columns to sections table
- Store in new table: turn_purchases
  (id, section_id, project_id, buyer_email, buyer_user_id,
  amount, stripe_payment_id, created_at)
- Fab Collab takes 10%
- Create migration 017_turn_purchases.sql

### Step 4 — Reserve My Spot Fee
On the campaign creation page:
- "Enable reservation period" toggle
- Reservation price: $5 (fixed)
- Reservation period end date (before campaign goes live)
- On campaign page before launch:
  "Reserve your spot for $5 — guaranteed access when 
  the campaign opens"
- Stripe checkout
- On campaign launch, reserved fans get priority access
- $5 credited as platform credit toward any future purchase
- Store in new table: campaign_reservations
  (id, campaign_id, user_id, email, stripe_payment_id,
  credit_remaining, created_at)
- Fab Collab takes 10%
- Create migration 018_campaign_reservations.sql

### Step 5 — Sponsor a Section
On the project editor:
- "Open for sponsorship" toggle on each section
- Sets sponsorship price: $50/$100/$500
- Public form at /sponsor where brands can browse 
  sponsorable sections and submit requests
- Manual review by Fab Collab team (email notification)
- On approval, sponsor name appears on feedback page
- Store in new table: section_sponsors
  (id, section_id, project_id, brand_name, brand_email,
  amount, stripe_payment_id, status, approved_at,
  created_at)
- Fab Collab takes 20%
- Create migration 019_section_sponsors.sql

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
- Industry waitlist page at /industry
- Authorship certificate PDF
- Comments on sections with threaded replies
- Public feedback link (/feedback/[token])
- Distribution integration (DistroKid)
- Writing streaks on dashboard
