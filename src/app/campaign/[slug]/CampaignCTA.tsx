"use client";

import Link from "next/link";
import { useState } from "react";
import { addCampaignWaitlist } from "./actions";

type Props = {
  slug: string;
  isFull: boolean;
  isLoggedIn: boolean;
  shareUrl: string;
  shareText: string;
};

export default function CampaignCTA({ slug, isFull, isLoggedIn, shareUrl, shareText }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const r = await addCampaignWaitlist({ slug, email, name });
    setBusy(false);
    if ("error" in r) setErr(r.error);
    else setAdded(true);
  };

  const doShare = async () => {
    const full = `${shareText}\n\n${shareUrl}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Collab It", text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(full);
    } catch {
      window.prompt("Copy this share text:", full);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isFull) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-coral/10 px-4 py-3 text-center text-sm font-semibold text-coral">
          Campaign full — join the waitlist
        </div>
        {added ? (
          <div className="rounded-xl bg-lagoon/10 p-4 text-center text-sm text-ocean">
            🙌 You&rsquo;re on the waitlist. We&rsquo;ll email you if a spot opens.
          </div>
        ) : (
          <form onSubmit={submitWaitlist} className="space-y-2">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-sm text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
            />
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-sm text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
            />
            {err && <p className="text-xs text-coral">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              style={{ backgroundColor: "#FF6B47", color: "white" }}
              className="w-full rounded-full px-5 py-2 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Adding…" : "Join waitlist"}
            </button>
          </form>
        )}
        <ShareRow onShare={doShare} copied={copied} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-3">
        <Link
          href={`/auth/login?next=${encodeURIComponent(`/campaign/${slug}`)}`}
          style={{ backgroundColor: "#FF6B47", color: "white" }}
          className="block rounded-full px-6 py-3 text-center font-display text-base font-semibold shadow transition hover:brightness-110 active:scale-95"
        >
          Join this collab →
        </Link>
        <p className="text-center text-xs text-ocean/60">
          Log in or sign up in one tap
        </p>
        <ShareRow onShare={doShare} copied={copied} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <form action="/campaign/action/join" method="post">
        <input type="hidden" name="slug" value={slug} />
        <SubmitJoin slug={slug} />
      </form>
      <ShareRow onShare={doShare} copied={copied} />
    </div>
  );
}

function SubmitJoin({ slug }: { slug: string }) {
  return (
    <Link
      href={`/campaign/${slug}/join`}
      style={{ backgroundColor: "#FF6B47", color: "white" }}
      className="block rounded-full px-6 py-3 text-center font-display text-base font-semibold shadow transition hover:brightness-110 active:scale-95"
    >
      Join this collab →
    </Link>
  );
}

function ShareRow({
  onShare,
  copied,
}: {
  onShare: () => void;
  copied: boolean;
}) {
  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={onShare}
        className="rounded-full border border-ocean/15 bg-white px-4 py-2 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
      >
        {copied ? "Copied!" : "Share this campaign"}
      </button>
    </div>
  );
}
