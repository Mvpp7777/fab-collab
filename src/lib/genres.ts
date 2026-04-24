import type { ProjectTypeId } from "./projectTypes";

export const GENRE_OPTIONS: Partial<Record<ProjectTypeId, string[]>> = {
  song: [
    "Pop",
    "Country",
    "Hip-Hop",
    "Rock",
    "R&B",
    "Electronic",
    "Folk",
    "Jazz",
    "Classical",
    "Other",
  ],
  screenplay: [
    "Drama",
    "Comedy",
    "Thriller",
    "Horror",
    "Sci-Fi",
    "Romance",
    "Action",
    "Documentary",
    "Other",
  ],
  novel: [
    "Literary Fiction",
    "Mystery",
    "Fantasy",
    "Sci-Fi",
    "Romance",
    "Historical",
    "Thriller",
    "Horror",
    "Other",
  ],
};

export const POPULAR_TYPES: ProjectTypeId[] = [
  "song",
  "screenplay",
  "business_plan",
  "think_tank",
];
