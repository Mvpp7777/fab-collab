export type ProjectTypeId =
  | "song"
  | "screenplay"
  | "novel"
  | "poetry"
  | "podcast"
  | "standup"
  | "game"
  | "ad"
  | "freeform"
  | "construction"
  | "home_renovation"
  | "business_plan"
  | "marketing_campaign"
  | "legal_document"
  | "research_project"
  | "event_planning"
  | "product_roadmap"
  | "meeting_agenda"
  | "proposal";

export type ProjectCategory = "creative" | "professional";

export type ProjectTypeMeta = {
  id: ProjectTypeId;
  label: string;
  emoji: string;
  description: string;
  category: ProjectCategory;
};

export const PROJECT_TYPES: ProjectTypeMeta[] = [
  // Creative
  { id: "song",       label: "Song",            emoji: "🎵", description: "Lyrics, hooks, and verses",           category: "creative" },
  { id: "screenplay", label: "Screenplay",      emoji: "🎬", description: "Scenes, acts, and dialogue",          category: "creative" },
  { id: "novel",      label: "Novel",           emoji: "📖", description: "Chapters and long-form prose",        category: "creative" },
  { id: "poetry",     label: "Poetry",          emoji: "✍️", description: "Stanzas and verse",                   category: "creative" },
  { id: "podcast",    label: "Podcast",         emoji: "🎙️", description: "Show scripts and segments",           category: "creative" },
  { id: "standup",    label: "Stand-up",        emoji: "🎤", description: "Bits, tags, and callbacks",           category: "creative" },
  { id: "game",       label: "Game narrative",  emoji: "🎮", description: "Branching dialogue and quests",       category: "creative" },
  { id: "ad",         label: "Ad / brand copy", emoji: "💡", description: "Taglines and campaigns",              category: "creative" },
  { id: "freeform",   label: "Freeform",        emoji: "✨", description: "Anything else",                       category: "creative" },

  // Professional
  { id: "construction",       label: "Construction project", emoji: "🏗️", description: "Plans, phases, and milestones",        category: "professional" },
  { id: "home_renovation",    label: "Home renovation",      emoji: "🏠", description: "Rooms, tasks, and timelines",          category: "professional" },
  { id: "business_plan",      label: "Business plan",        emoji: "📊", description: "Sections, strategy, and financials",   category: "professional" },
  { id: "marketing_campaign", label: "Marketing campaign",   emoji: "📣", description: "Goals, channels, and copy",            category: "professional" },
  { id: "legal_document",     label: "Legal document",       emoji: "⚖️", description: "Clauses, sections, and terms",         category: "professional" },
  { id: "research_project",   label: "Research project",     emoji: "🔬", description: "Hypothesis, findings, and conclusions", category: "professional" },
  { id: "event_planning",     label: "Event planning",       emoji: "🎉", description: "Venue, schedule, and logistics",       category: "professional" },
  { id: "product_roadmap",    label: "Product roadmap",      emoji: "🗺️", description: "Features, sprints, and goals",         category: "professional" },
  { id: "meeting_agenda",     label: "Meeting agenda",       emoji: "📋", description: "Topics, owners, and action items",     category: "professional" },
  { id: "proposal",           label: "Proposal",             emoji: "📝", description: "Executive summary, scope, and pricing", category: "professional" },
];

export const DEFAULT_SECTIONS: Record<ProjectTypeId, string[]> = {
  // Creative
  song:       ["Intro", "Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Bridge", "Outro"],
  screenplay: ["Title page", "Act 1", "Act 2A", "Midpoint", "Act 2B", "Act 3"],
  novel:      ["Synopsis", "Chapter 1", "Chapter 2", "Chapter 3"],
  poetry:     ["Stanza 1", "Stanza 2", "Stanza 3", "Closing stanza"],
  podcast:    ["Intro hook", "Segment 1", "Segment 2", "Outro"],
  standup:    ["Section 1", "Section 2", "Section 3"],
  game:       ["Section 1", "Section 2", "Section 3"],
  ad:         ["Section 1", "Section 2", "Section 3"],
  freeform:   ["Section 1", "Section 2", "Section 3"],

  // Professional
  construction:       ["Project overview", "Site preparation", "Foundation", "Framing", "Electrical", "Plumbing", "Finishing", "Inspection"],
  home_renovation:    ["Project scope", "Budget", "Room 1", "Room 2", "Timeline", "Contractor notes"],
  business_plan:      ["Executive summary", "Problem", "Solution", "Market analysis", "Revenue model", "Team", "Financials"],
  marketing_campaign: ["Campaign brief", "Target audience", "Messaging", "Channels", "Budget", "Timeline", "KPIs"],
  legal_document:     ["Parties", "Recitals", "Terms", "Obligations", "Payment", "Termination", "Signatures"],
  research_project:   ["Abstract", "Introduction", "Methodology", "Findings", "Analysis", "Conclusion", "References"],
  event_planning:     ["Event overview", "Venue", "Guest list", "Schedule", "Catering", "Budget", "Day-of checklist"],
  product_roadmap:    ["Vision", "Q1 goals", "Q2 goals", "Q3 goals", "Q4 goals", "Success metrics"],
  meeting_agenda:     ["Attendees", "Objectives", "Topic 1", "Topic 2", "Topic 3", "Action items", "Next steps"],
  proposal:           ["Executive summary", "About us", "The problem", "Our solution", "Scope of work", "Timeline", "Investment", "Next steps"],
};
