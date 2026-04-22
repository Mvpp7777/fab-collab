# Next session priorities

## Already shipped
- Invitations with email + shareable link
- Face to Face video dropdown (5 platforms)
- Notifications bell with unread count
- Export to text, PDF, Word
- Collaborator colors and attribution
- Turn awareness (Your turn vs Name's turn)
- Pass turn with email notification (in progress)
- Project completion flow with celebration modal (in progress)
- Public gallery with privacy controls (in progress)

## Next session — Industry Discovery Portal

### 1. Industry waitlist page at /industry
Build a landing page at fabcollab.vercel.app/industry for 
agents, A&R reps, publishers, and producers to sign up for 
early Scout access. Page should include:
- Headline: "Discover the next hit before anyone else"
- Subheading: "Get early access to completed projects from 
  songwriters, screenwriters, novelists and more"
- Form: Name, Company, Role (dropdown), What you're looking 
  for (text), Email
- Submit saves to a new industry_waitlist table in Supabase
- Confirmation message: "You're on the list. We'll be in 
  touch when Scout access opens."
- Brand colors and Syne font

### 2. Distribution integration (DistroKid first)
Add a "Distribute" button to completed song projects that:
- Links directly to DistroKid with UTM tracking
- Shows a simple guide: "How to get your song on Spotify"
- Tracks clicks so we know which users want this feature

### 3. Authorship certificate
When a project is marked complete, offer a downloadable 
PDF certificate showing:
- Project title
- All contributor names with their sections
- Completion date and timestamp
- Fab Collab logo and branding
- Text: "This certifies that the above contributors 
  co-created this work on Fab Collab"
Use the existing PDF export infrastructure (jspdf already installed)

### 4. Writing streaks
Track consecutive weeks a user has contributed to any project.
Show a streak counter on the dashboard:
- "🔥 3 week streak - keep going!"
- Reset if a week passes with no contributions
- Simple badge system: 1 week, 1 month, 3 months, 1 year
