"use client";

import { useEffect, useState } from "react";

export default function Countdown({ endDateIso }: { endDateIso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(endDateIso).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  if (diff <= 0) {
    return (
      <div className="text-sm font-semibold text-coral">
        Campaign ended
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 font-display text-ocean">
      <Cell value={days} label="days" />
      <span className="pb-1 text-lg text-ocean/40">:</span>
      <Cell value={hours} label="hrs" pad />
      <span className="pb-1 text-lg text-ocean/40">:</span>
      <Cell value={mins} label="min" pad />
      <span className="pb-1 text-lg text-ocean/40">:</span>
      <Cell value={secs} label="sec" pad />
    </div>
  );
}

function Cell({ value, label, pad }: { value: number; label: string; pad?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-extrabold">
        {pad ? String(value).padStart(2, "0") : value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-ocean/60">
        {label}
      </span>
    </div>
  );
}
