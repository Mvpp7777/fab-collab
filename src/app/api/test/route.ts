import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
      { status: 500 },
    );
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { ok: false, stage: "auth.getSession", error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase connection successful",
      projectUrl: url,
      hasSession: Boolean(data.session),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        stage: "client",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
