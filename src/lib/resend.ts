import "server-only";
import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export type SendInviteResult =
  | { ok: true }
  | { ok: false; reason: "missing_key" | "send_failed"; message: string };

export async function sendInviteEmail(params: {
  to: string;
  projectTitle: string;
  inviterName: string;
  inviteUrl: string;
}): Promise<SendInviteResult> {
  if (!process.env.RESEND_API_KEY) {
    return {
      ok: false,
      reason: "missing_key",
      message:
        "RESEND_API_KEY is not set. Add it to .env.local and Vercel env to enable email delivery.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `${params.inviterName} invited you to ${params.projectTitle} on Fab Collab`,
      html: inviteHtml(params),
      text: inviteText(params),
    });
    if (error) {
      return {
        ok: false,
        reason: "send_failed",
        message: error.message ?? "Resend returned an error",
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: "send_failed",
      message: e instanceof Error ? e.message : "unknown send error",
    };
  }
}

function inviteHtml(p: {
  projectTitle: string;
  inviterName: string;
  inviteUrl: string;
}): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#E8F8F8;padding:32px;color:#1A2E2E">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
      <div style="font-weight:800;font-size:28px;letter-spacing:-0.5px;margin-bottom:24px">
        <span style="color:#1A2E2E">fab</span><span style="color:#0BBFBF">collab</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px">You&rsquo;re invited</h1>
      <p style="margin:0 0 24px;color:#1A2E2E99">${escapeHtml(p.inviterName)} invited you to collaborate on <strong>${escapeHtml(p.projectTitle)}</strong>.</p>
      <a href="${p.inviteUrl}" style="display:inline-block;background:#FF6B47;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600">Accept invitation</a>
      <p style="margin:24px 0 0;font-size:12px;color:#1A2E2E80">Or paste this link in your browser: ${p.inviteUrl}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#1A2E2E80">This link expires in 7 days.</p>
    </div>
  </body></html>`;
}

function inviteText(p: {
  projectTitle: string;
  inviterName: string;
  inviteUrl: string;
}): string {
  return `${p.inviterName} invited you to collaborate on "${p.projectTitle}" on Fab Collab.

Accept here: ${p.inviteUrl}

This link expires in 7 days.`;
}

// -----------------------------------------------------------------------------
// Turn-passed email
// -----------------------------------------------------------------------------

export type SendTurnResult =
  | { ok: true }
  | { ok: false; reason: "missing_key" | "send_failed"; message: string };

export async function sendTurnEmail(params: {
  to: string;
  projectTitle: string;
  passerName: string;
  projectUrl: string;
}): Promise<SendTurnResult> {
  if (!process.env.RESEND_API_KEY) {
    return {
      ok: false,
      reason: "missing_key",
      message:
        "RESEND_API_KEY is not set. Add it to .env.local and Vercel env to enable email delivery.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `It's your turn on ${params.projectTitle} 🎵`,
      html: turnHtml(params),
      text: turnText(params),
    });
    if (error) {
      return {
        ok: false,
        reason: "send_failed",
        message: error.message ?? "Resend returned an error",
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      reason: "send_failed",
      message: e instanceof Error ? e.message : "unknown send error",
    };
  }
}

function turnHtml(p: {
  projectTitle: string;
  passerName: string;
  projectUrl: string;
}): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#E8F8F8;padding:32px;color:#1A2E2E">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
      <div style="font-weight:800;font-size:28px;letter-spacing:-0.5px;margin-bottom:24px">
        <span style="color:#1A2E2E">fab</span><span style="color:#0BBFBF">collab</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;color:#1A2E2E">It&rsquo;s your turn 🎵</h1>
      <p style="margin:0 0 24px;color:#1A2E2E99">${escapeHtml(p.passerName)} just passed the turn to you on <strong style="color:#0BBFBF">${escapeHtml(p.projectTitle)}</strong>. Click below to keep the momentum going.</p>
      <a href="${p.projectUrl}" style="display:inline-block;background:#FF6B47;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:15px">Write my part →</a>
      <p style="margin:24px 0 0;font-size:12px;color:#1A2E2E80">Or paste this link in your browser: ${p.projectUrl}</p>
    </div>
  </body></html>`;
}

function turnText(p: {
  projectTitle: string;
  passerName: string;
  projectUrl: string;
}): string {
  return `It's your turn on "${p.projectTitle}".

${p.passerName} just passed the turn to you. Click below to keep the momentum going.

${p.projectUrl}`;
}

// -----------------------------------------------------------------------------
// Investor "expressed interest" — emails the investor with the team's contacts.
// -----------------------------------------------------------------------------

export async function sendInvestorInterestEmail(params: {
  to: string;
  investorName: string;
  projectTitle: string;
  ownerName: string;
  ownerEmail: string | null;
  message: string | null;
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, message: "RESEND_API_KEY not set" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = `Your interest in “${params.projectTitle}” has been sent`;
  const ownerLine = params.ownerEmail
    ? `<a href="mailto:${params.ownerEmail}" style="color:#0BBFBF">${escapeHtml(params.ownerName)} (${escapeHtml(params.ownerEmail)})</a>`
    : escapeHtml(params.ownerName);
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#E8F8F8;padding:32px;color:#1A2E2E">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
      <div style="font-weight:800;font-size:26px;letter-spacing:-0.5px;margin-bottom:24px">
        <span style="color:#1A2E2E">fab</span><span style="color:#0BBFBF">collab</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px">Hi ${escapeHtml(params.investorName)} 👋</h1>
      <p style="margin:0 0 18px;color:#1A2E2E99">Thanks for expressing interest in <strong>${escapeHtml(params.projectTitle)}</strong>. The team has been notified and will reach out directly.</p>
      <p style="margin:0 0 6px;color:#1A2E2E"><strong>Team owner:</strong> ${ownerLine}</p>
      ${params.message ? `<p style="margin:18px 0 0;padding:12px 16px;border-left:3px solid #0BBFBF;color:#1A2E2E99;font-style:italic">Your message: ${escapeHtml(params.message)}</p>` : ""}
      <p style="margin:24px 0 0;font-size:12px;color:#1A2E2E80">— Fab Collab Think Tank</p>
    </div>
  </body></html>`;
  const text = [
    `Hi ${params.investorName},`,
    ``,
    `Thanks for expressing interest in "${params.projectTitle}". The team has been notified and will reach out directly.`,
    ``,
    `Team owner: ${params.ownerName}${params.ownerEmail ? ` (${params.ownerEmail})` : ""}`,
    params.message ? `\nYour message:\n${params.message}` : "",
    ``,
    `— Fab Collab Think Tank`,
  ].join("\n");
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject,
      html,
      text,
    });
    if (error) return { ok: false, message: error.message ?? "send failed" };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "send failed" };
  }
}

// -----------------------------------------------------------------------------
// Expert application internal notification (plain text to team inbox)
// -----------------------------------------------------------------------------

export async function sendExpertApplicationNotice(params: {
  to: string;
  name: string;
  title: string;
  company: string;
  category: string;
  email: string;
  linkedinUrl: string;
  contributionRate: string;
  yearsExperience: string;
  openToInvesting: boolean;
  achievements: string;
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, message: "RESEND_API_KEY not set" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = `New expert application from ${params.name} — ${params.title || "(no title)"} at ${params.company || "(no company)"}`;
  const body = [
    `Name: ${params.name}`,
    `Title: ${params.title}`,
    `Company: ${params.company}`,
    `Category: ${params.category}`,
    `Years: ${params.yearsExperience}`,
    `Rate: ${params.contributionRate}`,
    `Open to investing: ${params.openToInvesting ? "yes" : "no"}`,
    `LinkedIn: ${params.linkedinUrl}`,
    `Email: ${params.email}`,
    ``,
    `Achievements:`,
    params.achievements,
  ].join("\n");
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject,
      text: body,
    });
    if (error) return { ok: false, message: error.message ?? "send failed" };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "send failed" };
  }
}

// -----------------------------------------------------------------------------
// Weekly digest email
// -----------------------------------------------------------------------------

export async function sendDigestEmail(params: {
  to: string;
  userName: string;
  pendingTurns: Array<{ title: string; url: string }>;
  streakWeeks: number;
  unreadNotifications: number;
}): Promise<{ ok: boolean; message?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, message: "RESEND_API_KEY not set" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: "Your Fab Collab projects are waiting for you 🎵",
      html: digestHtml(params),
      text: digestText(params),
    });
    if (error) return { ok: false, message: error.message ?? "send failed" };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "send failed" };
  }
}

function digestHtml(p: {
  userName: string;
  pendingTurns: Array<{ title: string; url: string }>;
  streakWeeks: number;
  unreadNotifications: number;
}): string {
  const rows = p.pendingTurns
    .map(
      (t) =>
        `<li style="margin:0 0 8px"><a href="${t.url}" style="color:#0BBFBF;text-decoration:none;font-weight:600">${escapeHtml(t.title)}</a></li>`,
    )
    .join("");
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#E8F8F8;padding:32px;color:#1A2E2E">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
      <div style="font-weight:800;font-size:26px;letter-spacing:-0.5px;margin-bottom:24px">
        <span style="color:#1A2E2E">fab</span><span style="color:#0BBFBF">collab</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px">Hi ${escapeHtml(p.userName)} 👋</h1>
      <p style="margin:0 0 18px;color:#1A2E2E99">It's your turn on ${p.pendingTurns.length} project${p.pendingTurns.length === 1 ? "" : "s"}:</p>
      <ul style="margin:0 0 20px;padding:0 0 0 18px;color:#1A2E2E">${rows}</ul>
      ${p.streakWeeks > 0 ? `<p style="margin:0 0 16px;color:#1A2E2E"><strong>🔥 ${p.streakWeeks} week streak</strong> — keep it going!</p>` : ""}
      ${p.unreadNotifications > 0 ? `<p style="margin:0 0 16px;color:#1A2E2E">${p.unreadNotifications} unread notification${p.unreadNotifications === 1 ? "" : "s"} waiting.</p>` : ""}
      <p style="margin:24px 0 0;font-size:12px;color:#1A2E2E80">Not interested in weekly emails? Turn off "Weekly digest" in your profile settings.</p>
    </div>
  </body></html>`;
}

function digestText(p: {
  userName: string;
  pendingTurns: Array<{ title: string; url: string }>;
  streakWeeks: number;
  unreadNotifications: number;
}): string {
  const list = p.pendingTurns.map((t) => `• ${t.title}\n  ${t.url}`).join("\n");
  return `Hi ${p.userName},

It's your turn on ${p.pendingTurns.length} project${p.pendingTurns.length === 1 ? "" : "s"}:

${list}

${p.streakWeeks > 0 ? `🔥 ${p.streakWeeks} week streak — keep it going!\n` : ""}${p.unreadNotifications > 0 ? `${p.unreadNotifications} unread notifications waiting.\n` : ""}
— Fab Collab`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
