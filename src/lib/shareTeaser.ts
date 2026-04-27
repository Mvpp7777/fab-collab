import type { ProjectTypeId } from "./projectTypes";

export function buildTeaser(content: string, maxLen = 150): string {
  const cleaned = (content ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 3).trimEnd() + "...";
}

export function joinNames(names: string[], max = 3): string {
  const list = names.filter(Boolean).slice(0, max);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

export type SharePostParams = {
  projectType: ProjectTypeId | string;
  projectTitle: string;
  collaboratorNames: string[];
  firstSectionContent: string;
  feedbackUrl: string;
};

export function buildSharePost(p: SharePostParams): string {
  const names = joinNames(p.collaboratorNames) || "my team";
  const teaser = buildTeaser(p.firstSectionContent);
  const quoted = teaser ? `"${teaser}"` : "";

  const musicPoetry: Array<ProjectTypeId | string> = ["song", "poetry"];
  const screenplay: Array<ProjectTypeId | string> = ["screenplay", "game", "standup"];
  const businessThink: Array<ProjectTypeId | string> = [
    "business_plan",
    "proposal",
    "think_tank",
    "research_collective",
    "research_project",
    "innovation_sprint",
    "community_challenge",
    "marketing_campaign",
  ];

  if (musicPoetry.includes(p.projectType)) {
    return [
      `🎵 Working on something with ${names}.`,
      teaser ? `Here's a taste:` : "",
      quoted,
      `Want to hear more? Leave feedback 👇`,
      p.feedbackUrl,
      `#songwriting #collabit`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (screenplay.includes(p.projectType)) {
    return [
      `🎬 Co-writing something with ${names}. First look:`,
      quoted,
      `Tell me what you think 👇`,
      p.feedbackUrl,
      `#screenplay #writing #collabit`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (businessThink.includes(p.projectType)) {
    return [
      `🚀 Building something with ${names}.`,
      teaser ? `Here's our opening:` : "",
      quoted,
      `Would love your thoughts 👇`,
      p.feedbackUrl,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `✍️ Creating something with ${names} on Collab It.`,
    teaser ? `Here's a peek:` : "",
    quoted,
    p.feedbackUrl,
    `#collabit`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Twitter caps at 280 chars; truncate the middle teaser if the final post exceeds.
export function buildSharePostForX(p: SharePostParams): string {
  const base = buildSharePost(p);
  if (base.length <= 280) return base;
  // Rebuild with a smaller teaser.
  const shorterTeaser = buildTeaser(p.firstSectionContent, 60);
  const shortened = buildSharePost({ ...p, firstSectionContent: shorterTeaser });
  if (shortened.length <= 280) return shortened;
  // Last-resort: drop the teaser entirely.
  return buildSharePost({ ...p, firstSectionContent: "" }).slice(0, 280);
}
