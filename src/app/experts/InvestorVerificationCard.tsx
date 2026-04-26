"use client";

import { useEffect, useState } from "react";
import {
  getInvestorStatus,
  setInvestorStatus,
  type InvestorStatus,
} from "./actions";

export default function InvestorVerificationCard() {
  const [status, setStatus] = useState<InvestorStatus | null>(null);
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInvestorStatus().then((s) => {
      if (cancelled) return;
      setStatus(s);
      if (s.signedIn && s.company) setCompany(s.company);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-ocean/60 shadow-sm">
        Loading investor verification…
      </div>
    );
  }

  if (!status.signedIn) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="text-2xl" aria-hidden>🦈</div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-ocean">
              Verify as Investor
            </h3>
            <p className="mt-1 text-sm text-ocean/70">
              Get notified the moment a Think Tank opens for investment.
            </p>
            <a
              href="/auth/login?next=/experts"
              className="mt-3 inline-block rounded-full border border-ocean/15 bg-white px-4 py-1.5 text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white"
            >
              Sign in to verify →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    const r = await setInvestorStatus({
      verified: next,
      company: next ? company : null,
    });
    setBusy(false);
    if ("error" in r) {
      setErr(r.error);
      return;
    }
    setStatus({
      signedIn: true,
      isVerified: r.isVerified,
      company: r.company,
    });
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden>🦈</div>
        <div className="flex-1">
          <h3 className="font-display text-lg font-bold text-ocean">
            Verify as Investor
          </h3>
          <p className="mt-1 text-sm text-ocean/70">
            Get notified the moment a Think Tank opens for investment, and
            appear as &ldquo;[Name] from [Company]&rdquo; when you express interest.
          </p>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-ocean/10 bg-foam/40 p-3">
            <input
              type="checkbox"
              checked={status.isVerified}
              disabled={busy}
              onChange={(e) => submit(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#0BBFBF]"
            />
            <span className="text-sm text-ocean">
              I am an accredited investor interested in Think Tank opportunities
            </span>
          </label>

          {status.isVerified && (
            <div className="mt-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-ocean/70">
                  Company / fund (optional)
                </span>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onBlur={() => {
                    if ((status.company ?? "") !== company.trim()) {
                      void submit(true);
                    }
                  }}
                  placeholder="e.g. Acme Ventures"
                  className="w-full rounded-lg border border-ocean/15 bg-white px-3 py-2 text-sm text-ocean outline-none transition placeholder:text-ocean/40 focus:border-lagoon focus:ring-2 focus:ring-lagoon/30"
                />
              </label>
              <p className="mt-1 text-xs text-ocean/60">
                Saves on blur. Project teams will see this when you express interest.
              </p>
            </div>
          )}

          {err && (
            <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">
              {err}
            </p>
          )}

          {status.isVerified && (
            <p className="mt-3 rounded-md bg-lagoon/10 px-3 py-2 text-sm text-lagoon">
              ✓ Verified. Browse open opportunities at{" "}
              <a href="/invest" className="font-semibold underline hover:no-underline">
                /invest
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
