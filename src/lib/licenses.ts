export type LicenseId =
  | "all-rights-reserved"
  | "cc-by"
  | "cc-by-nc"
  | "cc-by-sa";

export type LicenseMeta = {
  id: LicenseId;
  badge: string;
  name: string;
  description: string;
};

export const LICENSES: LicenseMeta[] = [
  {
    id: "all-rights-reserved",
    badge: "© All Rights Reserved",
    name: "All Rights Reserved",
    description:
      "Only you and your collaborators can use this work.",
  },
  {
    id: "cc-by",
    badge: "CC BY",
    name: "Creative Commons — Attribution",
    description: "Anyone can use this with attribution.",
  },
  {
    id: "cc-by-nc",
    badge: "CC BY-NC",
    name: "Creative Commons — Attribution-NonCommercial",
    description:
      "Anyone can use this non-commercially with attribution.",
  },
  {
    id: "cc-by-sa",
    badge: "CC BY-SA",
    name: "Creative Commons — Attribution-ShareAlike",
    description: "Anyone can use this if they share alike.",
  },
];

export function licenseMeta(id: string | null | undefined): LicenseMeta {
  const match = LICENSES.find((l) => l.id === id);
  return match ?? LICENSES[0];
}
