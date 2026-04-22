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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
