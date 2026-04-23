import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Industry Scout Access — Fab Collab",
  description:
    "Get early access to completed projects from emerging creative talent before anyone else.",
  openGraph: {
    title: "Industry Scout Access — Fab Collab",
    description:
      "Get early access to completed projects from emerging creative talent before anyone else.",
    type: "website",
  },
};

export default function IndustryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
