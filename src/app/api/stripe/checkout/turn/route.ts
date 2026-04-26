import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicOrigin } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    token?: string;
    section_id?: string;
    buyer_email?: string;
    buyer_user_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = (body.token ?? "").trim();
  const sectionId = (body.section_id ?? "").trim();
  if (!token || !sectionId) {
    return NextResponse.json(
      { error: "Missing feedback token or section id." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("id, title")
    .eq("feedback_token", token)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { data: section } = await admin
    .from("sections")
    .select("id, title, position, project_id, purchasable, purchase_price_cents")
    .eq("id", sectionId)
    .maybeSingle();
  if (!section || section.project_id !== project.id) {
    return NextResponse.json({ error: "Section not found." }, { status: 404 });
  }
  if (!section.purchasable) {
    return NextResponse.json(
      { error: "This section is not open for purchase." },
      { status: 400 },
    );
  }
  const priceCents = Number(section.purchase_price_cents ?? 0);
  if (!Number.isFinite(priceCents) || priceCents < 100) {
    return NextResponse.json(
      { error: "Section price is not configured." },
      { status: 400 },
    );
  }

  const buyerEmail = (body.buyer_email ?? "").trim().toLowerCase().slice(0, 200);
  const buyerUserId = (body.buyer_user_id ?? "").trim() || "";
  const origin = getPublicOrigin();
  const sectionLabel = section.title ?? `Section ${(section.position ?? 0) + 1}`;

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Co-write a turn: ${sectionLabel}`,
              description: `Buy a turn on "${project.title}" — you become a collaborator and join the relay queue.`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      customer_email: buyerEmail || undefined,
      success_url: `${origin}/feedback/${token}?turn=purchased&section=${sectionId}`,
      cancel_url: `${origin}/feedback/${token}?turn=cancelled`,
      metadata: {
        kind: "turn",
        project_id: project.id,
        section_id: sectionId,
        feedback_token: token,
        buyer_email: buyerEmail,
        buyer_user_id: buyerUserId,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
