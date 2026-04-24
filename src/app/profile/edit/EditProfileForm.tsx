"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateProfile, type UpdateProfileResult } from "./actions";

export default function EditProfileForm({
  initialDisplayName,
  initialUsername,
  initialBio,
  initialDigestEnabled,
  email,
}: {
  initialDisplayName: string;
  initialUsername: string;
  initialBio: string;
  initialDigestEnabled: boolean;
  email: string;
}) {
  const [state, formAction] = useFormState<UpdateProfileResult | null, FormData>(
    updateProfile,
    null,
  );
  const [bio, setBio] = useState(initialBio);

  return (
    <form action={formAction} className="mt-8 space-y-5 rounded-2xl bg-white p-6 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ocean">Display name</span>
        <input
          type="text"
          name="display_name"
          defaultValue={initialDisplayName}
          placeholder="Your full name"
          className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ocean">
          Username <span className="text-coral">*</span>
        </span>
        <input
          type="text"
          name="username"
          required
          defaultValue={initialUsername}
          placeholder="yourname"
          pattern="[a-zA-Z0-9_]{2,32}"
          title="2–32 characters. Letters, numbers, and underscores only."
          className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
        <span className="mt-1 block text-xs text-ocean/50">
          Letters, numbers, underscores. 2–32 characters.
        </span>
      </label>
      <label className="block">
        <span className="mb-1 flex items-center justify-between text-sm font-medium text-ocean">
          <span>Bio</span>
          <span className="text-xs text-ocean/50">{bio.length}/160</span>
        </span>
        <textarea
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 160))}
          rows={3}
          maxLength={160}
          placeholder="One sentence about you."
          className="w-full resize-y rounded-lg border border-ocean/15 bg-white px-3 py-2 text-ocean outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
        />
      </label>
      <label className="flex items-start gap-3 rounded-md border border-ocean/10 bg-foam/60 px-3 py-2 text-sm">
        <input
          type="checkbox"
          name="email_digest_enabled"
          defaultChecked={initialDigestEnabled}
          className="mt-0.5 h-4 w-4 accent-[#0BBFBF]"
        />
        <span>
          <span className="font-semibold text-ocean">Weekly digest email</span>
          <span className="mt-0.5 block text-xs text-ocean/60">
            Get a Monday email when your turn is waiting on a project.
          </span>
        </span>
      </label>
      <div className="rounded-md bg-foam/60 px-3 py-2 text-xs text-ocean/60">
        Signed in as <span className="font-semibold text-ocean">{email}</span>
      </div>
      {state && "error" in state && (
        <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{ backgroundColor: "#FF6B47", color: "white" }}
      className="w-full rounded-full px-5 py-2.5 font-display text-sm font-semibold shadow transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save profile"}
    </button>
  );
}
