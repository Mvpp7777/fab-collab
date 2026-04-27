import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become an Expert — Collab It",
  description:
    "Share your expertise with collaborative teams and get paid for your knowledge.",
  openGraph: {
    title: "Become an Expert — Collab It",
    description:
      "Share your expertise with collaborative teams and get paid for your knowledge.",
    type: "website",
  },
};

export default function ExpertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
