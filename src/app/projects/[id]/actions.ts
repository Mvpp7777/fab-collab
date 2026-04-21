"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export type AssistType = "suggest-line" | "rhyme" | "rewrite" | "unblock";

const SYSTEM_PROMPTS: Record<AssistType, string> = {
  "suggest-line":
    "You are a creative writing assistant. Suggest the next line that naturally follows the existing text. Match the tone, style and rhythm exactly. Return exactly 3 options numbered 1-3, one per line, no explanation.",
  rhyme:
    "Return rhymes for the last word in the text provided. Format: Perfect: word1, word2 / Near: word1, word2 / Slant: word1, word2",
  rewrite:
    "Rewrite the provided text to be more vivid and compelling while keeping the same meaning. Return only the rewritten text.",
  unblock:
    "The writer is stuck. Read the text and suggest 3 creative directions it could go next. One sentence each, numbered 1-3.",
};

export type AiAssistResult = { text: string } | { error: string };

export async function aiAssist(params: {
  sectionText: string;
  projectType: string;
  assistType: AssistType;
}): Promise<AiAssistResult> {
  const { sectionText, projectType, assistType } = params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY is not set in .env.local." };
  }
  if (!SYSTEM_PROMPTS[assistType]) {
    return { error: `Unknown assistType: ${assistType}` };
  }
  if (!sectionText.trim()) {
    return { error: "Write something first — AI needs text to work with." };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPTS[assistType],
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Project type: ${projectType}\n\nText:\n${sectionText}`,
        },
      ],
    });

    const text = msg.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return { text };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Anthropic API error" };
  }
}

export type SaveSectionResult = { ok: true } | { error: string };

export async function saveSection(params: {
  sectionId: string;
  content: string;
}): Promise<SaveSectionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("content_snapshots").insert({
    section_id: params.sectionId,
    content_text: params.content,
    saved_by: user.id,
    is_autosave: true,
  });

  if (error) return { error: error.message };
  return { ok: true };
}

export type PassTurnResult =
  | { ok: true; nextName: string | null }
  | { error: string };

export async function passTurn(params: {
  projectId: string;
  activeSectionId: string | null;
}): Promise<PassTurnResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, title, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();
  if (projectErr || !project) {
    return { error: projectErr?.message ?? "Project not found" };
  }

  // Find collaborators with turn_order set (real relay), ordered by turn.
  const { data: collaborators } = await supabase
    .from("collaborators")
    .select("user_id, turn_order, users(display_name)")
    .eq("project_id", project.id)
    .not("turn_order", "is", null)
    .order("turn_order", { ascending: true });

  // Single-user path: no other collaborator to pass to.
  // Still lock the active section so the UI reflects the handed-off state.
  if (!collaborators || collaborators.length < 2) {
    if (params.activeSectionId) {
      await supabase
        .from("sections")
        .update({ is_locked: true })
        .eq("id", params.activeSectionId);
    }
    return { ok: true, nextName: null };
  }

  // Multi-user path: pick next in the cycle after the current user.
  const currentIdx = collaborators.findIndex((c) => c.user_id === user.id);
  const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % collaborators.length;
  const next = collaborators[nextIdx];
  // PostgREST returns nested selects as arrays even for 1-1 joins.
  const usersRel = next.users as
    | { display_name: string | null }
    | { display_name: string | null }[]
    | null;
  const userRow = Array.isArray(usersRel) ? usersRel[0] : usersRel;
  const nextName = userRow?.display_name ?? "your collaborator";

  if (params.activeSectionId) {
    await supabase
      .from("sections")
      .update({ is_locked: true })
      .eq("id", params.activeSectionId);
  }

  await supabase.from("notifications").insert({
    user_id: next.user_id,
    type: "turn_passed",
    project_id: project.id,
    body: `Your turn on ${project.title}`,
    link: `/projects/${project.id}`,
    read: false,
  });

  return { ok: true, nextName };
}
