"use client";

type Entry = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  role: string | null;
  looking_for: string | null;
  created_at: string;
};

function escapeCsv(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function WaitlistExport({ entries }: { entries: Entry[] }) {
  const download = () => {
    const header = ["Name", "Email", "Company", "Role", "Looking for", "Joined"];
    const rows = entries.map((e) =>
      [
        e.name,
        e.email,
        e.company ?? "",
        e.role ?? "",
        e.looking_for ?? "",
        new Date(e.created_at).toISOString(),
      ]
        .map(escapeCsv)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `industry-waitlist-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={entries.length === 0}
      className="rounded-full border border-ocean/20 bg-white px-3 py-1.5 text-xs font-semibold text-ocean hover:bg-ocean hover:text-white disabled:opacity-60"
    >
      Export CSV ({entries.length})
    </button>
  );
}
