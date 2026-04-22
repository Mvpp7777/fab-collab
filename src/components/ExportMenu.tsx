"use client";

import { useEffect, useRef, useState } from "react";

export type ExportSection = { title: string | null; content: string; position: number };

type Props = {
  projectTitle: string;
  sections: ExportSection[];
};

export default function ExportMenu({ projectTitle, sections }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const safeFilename = (projectTitle || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "project";

  const downloadBlob = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const buildText = () => {
    const lines: string[] = [];
    lines.push(projectTitle || "Untitled");
    lines.push("=".repeat(Math.max(10, (projectTitle || "Untitled").length)));
    lines.push("");
    for (const s of sections) {
      const title = s.title ?? `Section ${s.position + 1}`;
      lines.push(title);
      lines.push("-".repeat(Math.max(6, title.length)));
      lines.push(s.content || "");
      lines.push("");
    }
    return lines.join("\n");
  };

  const exportText = () => {
    const blob = new Blob([buildText()], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, "txt");
    setOpen(false);
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const margin = 60;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const addWrappedText = (
        text: string,
        size: number,
        style: "normal" | "bold" = "normal",
        color: [number, number, number] = [26, 46, 46],
      ) => {
        doc.setFont("Helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text || " ", maxWidth) as string[];
        for (const line of lines) {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += size * 1.4;
        }
      };

      addWrappedText(projectTitle || "Untitled", 22, "bold", [11, 191, 191]);
      y += 10;

      for (const s of sections) {
        const title = s.title ?? `Section ${s.position + 1}`;
        if (y > pageHeight - margin - 40) {
          doc.addPage();
          y = margin;
        }
        addWrappedText(title, 14, "bold", [26, 46, 46]);
        y += 4;
        addWrappedText(s.content || "", 11, "normal", [26, 46, 46]);
        y += 12;
      }

      doc.save(`${safeFilename}.pdf`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const exportDocx = async () => {
    setBusy(true);
    try {
      const {
        Document,
        Packer,
        Paragraph,
        HeadingLevel,
        TextRun,
      } = await import("docx");

      const children = [
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [
            new TextRun({
              text: projectTitle || "Untitled",
              bold: true,
              color: "0BBFBF",
            }),
          ],
        }),
        new Paragraph({ text: "" }),
      ];

      for (const s of sections) {
        const title = s.title ?? `Section ${s.position + 1}`;
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: title, bold: true })],
          }),
        );
        const lines = (s.content || "").split(/\r?\n/);
        for (const line of lines) {
          children.push(new Paragraph({ children: [new TextRun(line)] }));
        }
        children.push(new Paragraph({ text: "" }));
      }

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, "docx");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        className="rounded-full border border-ocean/15 bg-white px-3 py-1.5 font-display text-sm font-medium text-ocean transition hover:bg-ocean hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Exporting…" : "Export ↓"}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-ocean/10 bg-white py-1 shadow-lg"
        >
          <ExportItem emoji="📝" label="Plain text (.txt)" onClick={exportText} />
          <ExportItem emoji="📄" label="PDF (.pdf)" onClick={exportPdf} />
          <ExportItem emoji="📰" label="Word (.docx)" onClick={exportDocx} />
        </div>
      )}
    </div>
  );
}

function ExportItem({
  emoji,
  label,
  onClick,
}: {
  emoji: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-ocean transition hover:bg-foam"
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
