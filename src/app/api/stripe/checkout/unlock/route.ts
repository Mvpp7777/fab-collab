import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { token?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Missing feedback token." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, title, unlock_price_cents")
    .eq("feedback_token", token)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  const priceCents = Number(project.unlock_price_cents ?? 300);
  if (!Number.isFinite(priceCents) || priceCents < 100) {
    return NextResponse.json(
      { error: "Unlock price is not configured." },
      { status: 400 },
    );
  }

  const origin = getPublicOrigin();
  const email = (body.email ?? "").trim().toLowerCase().slice(0, 200);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Unlock the full story: ${project.title}`,
              description: "One-time unlock of the full collaboration on Collab It.",
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: `${origin}/feedback/${token}?unlock_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/feedback/${token}?unlock=cancelled`,
      metadata: {
        kind: "unlock",
        project_id: project.id,
        feedback_token: token,
        email,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
