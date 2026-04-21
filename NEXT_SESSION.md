# Next session priorities

## 1. Invitations
Build the ability for a project owner to invite a collaborator 
by email. When invited, the person receives an email with a link 
to join the project. When they click the link they create an 
account and are added to the project as a collaborator with 
turn_order set.

Use these defaults:
- Email provider: Resend
- Existing users: show a "Join project" confirmation page
- Turn order: auto-assign next integer
- Default role: editor, owner can change
- Invite UI: share button + modal on the editor page
- Token lifetime: 7 days

## 2. Start a call
Add a "Start a call" button on the project editor that opens 
a modal where collaborators can choose their preferred video 
platform:
- Google Meet (generate a meet link instantly, copy to clipboard)
- Zoom (open zoom.us/start)
- FaceTime (deep link for Mac/iPhone users)
- Microsoft Teams (open teams link)
- Discord (open discord.gg)

The generated link should also be sent as a notification to 
all project collaborators so everyone gets it instantly.
