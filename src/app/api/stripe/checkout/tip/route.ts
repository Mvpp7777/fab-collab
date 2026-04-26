import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUICK_AMOUNTS_CENTS = new Set([100, 300, 500, 1000]);
const MAX_AMOUNT_CENTS = 100_000; // $1,000

export async function POST(req: Request) {
  let body: {
    token?: string;
    amount_cents?: number;
    tipper_name?: string;
    tipper_email?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const amountCents = Math.round(Number(body.amount_cents ?? 0));
  if (!token) {
    return NextResponse.json({ error: "Missing feedback token." }, { status: 400 });
  }
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return NextResponse.json(
      { error: "Tip must be at least $1." },
      { status: 400 },
    );
  }
  if (amountCents > MAX_AMOUNT_CENTS) {
    return NextResponse.json(
      { error: "Tip exceeds the $1,000 maximum." },
      { status: 400 },
    );
  }
  // Allow custom amounts but cap; quick amounts are still valid.
  void QUICK_AMOUNTS_CENTS;

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, title")
    .eq("feedback_token", token)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const origin = getPublicOrigin();
  const tipperName = (body.tipper_name ?? "").trim().slice(0, 80);
  const tipperEmail = (body.tipper_email ?? "").trim().toLowerCase().slice(0, 200);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Tip for ${project.title}`,
              description: "Support the creators of this project on Fab Collab.",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      customer_email: tipperEmail || undefined,
      success_url: `${origin}/feedback/${token}?tipped=true`,
      cancel_url: `${origin}/feedback/${token}?tipped=cancelled`,
      metadata: {
        kind: "tip",
        project_id: project.id,
        feedback_token: token,
        tipper_name: tipperName,
        tipper_email: tipperEmail,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
