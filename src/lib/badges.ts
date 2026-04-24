export type BadgeId =
  | "first_song"
  | "first_collab"
  | "on_a_roll"
  | "consistent_creator"
  | "legend"
  | "think_tank"
  | "community_builder"
  | "expert_seeker"
  | "campaign_creator"
  | "viral";

export type BadgeMeta = {
  id: BadgeId;
  emoji: string;
  name: string;
  description: string;
};

export const BADGES: BadgeMeta[] = [
  { id: "first_song",          emoji: "🎵", name: "First Song",          description: "Complete your first song project" },
  { id: "first_collab",        emoji: "🤝", name: "First Collab",        description: "Complete a project with at least one other person" },
  { id: "on_a_roll",           emoji: "🔥", name: "On a Roll",           description: "3 week writing streak" },
  { id: "consistent_creator",  emoji: "⭐", name: "Consistent Creator",   description: "4 week writing streak" },
  { id: "legend",              emoji: "🏆", name: "Legend",              description: "Complete 10 projects" },
  { id: "think_tank",          emoji: "💡", name: "Think Tank",          description: "Complete a Think Tank project" },
  { id: "community_builder",   emoji: "🌍", name: "Community Builder",   description: "5+ collaborators across all projects" },
  { id: "expert_seeker",       emoji: "🎯", name: "Expert Seeker",       description: "Request an expert contribution" },
  { id: "campaign_creator",    emoji: "📢", name: "Campaign Creator",    description: "Launch an influencer campaign" },
  { id: "viral",               emoji: "🚀", name: "Viral",               description: "Have a campaign reach 50+ participants" },
];

export function badgeMeta(id: string): BadgeMeta | null {
  return BADGES.find((b) => b.id === id) ?? null;
}
