import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { colorForTurnOrder } from "@/lib/colors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORM_FEE_BPS = 1000; // 10%

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set." },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    } else if (event.type === "payment_intent.succeeded") {
      // Backup confirmation — checkout.session.completed already records the
      // primary success, so this is intentionally a no-op for now.
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler error";
    // Return 500 so Stripe retries; but log via response body.
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function platformFeeCents(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_BPS) / 10_000);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const kind = session.metadata?.kind;
  const amountCents = session.amount_total ?? 0;
  if (!kind || amountCents <= 0) return;

  const admin = createAdminClient();
  const sessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  if (kind === "tip") {
    await handleTipCompleted({ admin, session, sessionId, paymentIntentId, amountCents });
  } else if (kind === "unlock") {
    await handleUnlockCompleted({ admin, session, sessionId, paymentIntentId, amountCents });
  } else if (kind === "turn") {
    await handleTurnCompleted({ admin, session, sessionId, paymentIntentId, amountCents });
  }
}

type Admin = ReturnType<typeof createAdminClient>;

async function handleTipCompleted(args: {
  admin: Admin;
  session: Stripe.Checkout.Session;
  sessionId: string;
  paymentIntentId: string | null;
  amountCents: number;
}) {
  const { admin, session, sessionId, paymentIntentId, amountCents } = args;
  const projectId = session.metadata?.project_id;
  if (!projectId) return;

  const tipperEmail =
    session.customer_details?.email ??
    session.metadata?.tipper_email ??
    null;
  const tipperName =
    session.metadata?.tipper_name ??
    session.customer_details?.name ??
    null;

  const { error: insertErr } = await admin.from("tips").insert({
    project_id: projectId,
    tipper_name: tipperName?.trim() || null,
    tipper_email: tipperEmail?.trim().toLowerCase() || null,
    amount_cents: amountCents,
    platform_fee_cents: platformFeeCents(amountCents),
    stripe_payment_intent_id: paymentIntentId,
    stripe_session_id: sessionId,
    status: "succeeded",
  });
  if (insertErr && !/duplicate key|unique/i.test(insertErr.message)) {
    throw new Error(`tips insert: ${insertErr.message}`);
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const { data: collaborators } = await admin
    .from("collaborators")
    .select("user_id")
    .eq("project_id", projectId);

  const dollars = (amountCents / 100).toFixed(amountCents % 100 === 0 ? 0 : 2);
  const rows = (collaborators ?? []).map((c) => ({
    user_id: c.user_id,
    type: "tip_received",
    project_id: projectId,
    body: `Someone tipped $${dollars} on ${project.title}! 🎉`,
    link: `/projects/${projectId}`,
    read: false,
  }));
  if (rows.length > 0) {
    await admin.from("notifications").insert(rows);
  }
}

async function handleUnlockCompleted(args: {
  admin: Admin;
  session: Stripe.Checkout.Session;
  sessionId: string;
  paymentIntentId: string | null;
  amountCents: number;
}) {
  const { admin, session, sessionId, paymentIntentId, amountCents } = args;
  const projectId = session.metadata?.project_id;
  if (!projectId) return;

  const email =
    session.customer_details?.email ??
    session.metadata?.email ??
    null;

  const { error: insertErr } = await admin.from("content_unlocks").insert({
    project_id: projectId,
    email: email?.trim().toLowerCase() || null,
    amount_cents: amountCents,
    platform_fee_cents: platformFeeCents(amountCents),
    stripe_payment_intent_id: paymentIntentId,
    stripe_session_id: sessionId,
    status: "succeeded",
  });
  if (insertErr && !/duplicate key|unique/i.test(insertErr.message)) {
    throw new Error(`content_unlocks insert: ${insertErr.message}`);
  }
}

async function handleTurnCompleted(args: {
  admin: Admin;
  session: Stripe.Checkout.Session;
  sessionId: string;
  paymentIntentId: string | null;
  amountCents: number;
}) {
  const { admin, session, sessionId, paymentIntentId, amountCents } = args;
  const projectId = session.metadata?.project_id;
  const sectionId = session.metadata?.section_id;
  if (!projectId || !sectionId) return;

  const buyerEmail =
    session.customer_details?.email ??
    session.metadata?.buyer_email ??
    null;
  const buyerUserId = session.metadata?.buyer_user_id || null;

  const { error: insertErr } = await admin.from("turn_purchases").insert({
    project_id: projectId,
    section_id: sectionId,
    buyer_email: buyerEmail?.trim().toLowerCase() || null,
    buyer_user_id: buyerUserId || null,
    amount_cents: amountCents,
    platform_fee_cents: platformFeeCents(amountCents),
    stripe_payment_intent_id: paymentIntentId,
    stripe_session_id: sessionId,
    status: "succeeded",
  });
  if (insertErr && !/duplicate key|unique/i.test(insertErr.message)) {
    throw new Error(`turn_purchases insert: ${insertErr.message}`);
  }

  const { data: project } = await admin
    .from("projects")
    .select("id, title, owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const { data: section } = await admin
    .from("sections")
    .select("id, title, position")
    .eq("id", sectionId)
    .maybeSingle();
  const sectionLabel = section?.title ?? `Section ${(section?.position ?? 0) + 1}`;

  // If the buyer has an account, add them as a collaborator and seed onboarding.
  if (buyerUserId) {
    const { data: existing } = await admin
      .from("collaborators")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", buyerUserId)
      .maybeSingle();
    if (!existing) {
      const { data: existingCollabs } = await admin
        .from("collaborators")
        .select("turn_order")
        .eq("project_id", projectId)
        .order("turn_order", { ascending: false, nullsFirst: false })
        .limit(1);
      const nextTurnOrder = (existingCollabs?.[0]?.turn_order ?? 0) + 1;
      await admin.from("collaborators").insert({
        project_id: projectId,
        user_id: buyerUserId,
        role: "editor",
        turn_order: nextTurnOrder,
        color: colorForTurnOrder(nextTurnOrder),
        invited_by: project.owner_id,
      });
    }

    // Welcome notification to the buyer.
    await admin.from("notifications").insert({
      user_id: buyerUserId,
      type: "turn_purchased_welcome",
      project_id: projectId,
      body: `Welcome to ${project.title}! You bought a turn on ${sectionLabel}.`,
      link: `/projects/${projectId}`,
      read: false,
    });
  }

  // Notify the owner.
  const buyerLabel =
    buyerEmail?.trim() || (buyerUserId ? "A new collaborator" : "Someone");
  await admin.from("notifications").insert({
    user_id: project.owner_id,
    type: "turn_purchased",
    project_id: projectId,
    body: `${buyerLabel} purchased a turn on ${sectionLabel}!`,
    link: `/projects/${projectId}`,
    read: false,
  });
}
