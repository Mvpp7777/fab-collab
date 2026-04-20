export type ProjectTypeId =
  | "song"
  | "screenplay"
  | "novel"
  | "poetry"
  | "podcast"
  | "standup"
  | "game"
  | "ad"
  | "freeform";

export type ProjectTypeMeta = {
  id: ProjectTypeId;
  label: string;
  emoji: string;
  description: string;
};

export const PROJECT_TYPES: ProjectTypeMeta[] = [
  { id: "song",       label: "Song",            emoji: "🎵", description: "Lyrics, hooks, and verses" },
  { id: "screenplay", label: "Screenplay",      emoji: "🎬", description: "Scenes, acts, and dialogue" },
  { id: "novel",      label: "Novel",           emoji: "📖", description: "Chapters and long-form prose" },
  { id: "poetry",     label: "Poetry",          emoji: "✒️",  description: "Stanzas and verse" },
  { id: "podcast",    label: "Podcast",         emoji: "🎙️", description: "Show scripts and segments" },
  { id: "standup",    label: "Stand-up",        emoji: "🎤", description: "Bits, tags, and callbacks" },
  { id: "game",       label: "Game narrative",  emoji: "🎮", description: "Branching dialogue and quests" },
  { id: "ad",         label: "Ad / brand copy", emoji: "💡", description: "Taglines and campaigns" },
  { id: "freeform",   label: "Freeform",        emoji: "🪄", description: "Anything else" },
];

export const DEFAULT_SECTIONS: Record<ProjectTypeId, string[]> = {
  song:       ["Intro", "Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Bridge", "Outro"],
  screenplay: ["Title page", "Act 1", "Act 2A", "Midpoint", "Act 2B", "Act 3"],
  novel:      ["Synopsis", "Chapter 1", "Chapter 2", "Chapter 3"],
  poetry:     ["Stanza 1", "Stanza 2", "Stanza 3", "Closing stanza"],
  podcast:    ["Intro hook", "Segment 1", "Segment 2", "Outro"],
  standup:    ["Section 1", "Section 2", "Section 3"],
  game:       ["Section 1", "Section 2", "Section 3"],
  ad:         ["Section 1", "Section 2", "Section 3"],
  freeform:   ["Section 1", "Section 2", "Section 3"],
};
