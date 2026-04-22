// Client-side Fab Collab authorship certificate generator.
// Uses jspdf (already installed). Dynamic import keeps the lib out of the
// initial bundle.

export type CertificateContributor = {
  name: string;
  color: string;
  sections?: string[];
};

export async function generateCertificatePdf(params: {
  projectTitle: string;
  contributors: CertificateContributor[];
  completedAtIso: string | null;
}): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const inner = pageW - margin * 2;

  // Foam background
  doc.setFillColor(232, 248, 248);
  doc.rect(0, 0, pageW, pageH, "F");

  // Inner white card with coral border
  const cardX = margin;
  const cardY = margin;
  const cardW = pageW - margin * 2;
  const cardH = pageH - margin * 2;
  doc.setFillColor(255, 255, 255);
  doc.rect(cardX, cardY, cardW, cardH, "F");
  doc.setDrawColor(255, 107, 71); // coral
  doc.setLineWidth(3);
  doc.rect(cardX + 6, cardY + 6, cardW - 12, cardH - 12);

  // Wordmark
  let y = cardY + 56;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(26, 46, 46); // ocean
  const fabW = doc.getTextWidth("fab");
  const collabW = doc.getTextWidth("collab");
  const wordmarkX = (pageW - (fabW + collabW)) / 2;
  doc.text("fab", wordmarkX, y);
  doc.setTextColor(11, 191, 191); // lagoon
  doc.text("collab", wordmarkX + fabW, y);

  // Subtitle
  y += 40;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(26, 46, 46);
  const subtitle = "CERTIFICATE OF AUTHORSHIP";
  doc.text(subtitle, (pageW - doc.getTextWidth(subtitle)) / 2, y);

  // Ornamental rule
  y += 18;
  doc.setDrawColor(11, 191, 191);
  doc.setLineWidth(1);
  doc.line(pageW / 2 - 60, y, pageW / 2 + 60, y);

  // "This certifies that..."
  y += 46;
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(26, 46, 46);
  const certLine = "This certifies that the contributors below";
  doc.text(certLine, (pageW - doc.getTextWidth(certLine)) / 2, y);
  y += 18;
  const certLine2 = "co-created the following work on Fab Collab:";
  doc.text(certLine2, (pageW - doc.getTextWidth(certLine2)) / 2, y);

  // Project title
  y += 48;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(11, 191, 191); // lagoon
  const title = params.projectTitle || "Untitled";
  const titleLines = doc.splitTextToSize(title, inner - 40) as string[];
  for (const line of titleLines) {
    doc.text(line, (pageW - doc.getTextWidth(line)) / 2, y);
    y += 28;
  }

  y += 16;

  // Contributors heading
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(26, 46, 46);
  const contribHeading = "CONTRIBUTORS";
  doc.text(contribHeading, (pageW - doc.getTextWidth(contribHeading)) / 2, y);
  y += 14;
  doc.setDrawColor(26, 46, 46);
  doc.setLineWidth(0.4);
  const ruleLen = 80;
  doc.line((pageW - ruleLen) / 2, y, (pageW + ruleLen) / 2, y);
  y += 22;

  // Contributor rows
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(13);
  for (const c of params.contributors) {
    if (y > pageH - 140) {
      doc.addPage();
      y = margin + 40;
    }
    const rgb = hexToRgb(c.color);
    // Color swatch
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const swatchSize = 10;
    const nameStr = c.name;
    const nameW = doc.getTextWidth(nameStr);
    const rowW = swatchSize + 10 + nameW;
    const rowX = (pageW - rowW) / 2;
    doc.rect(rowX, y - swatchSize + 1, swatchSize, swatchSize, "F");
    doc.setTextColor(26, 46, 46);
    doc.setFont("Helvetica", "bold");
    doc.text(nameStr, rowX + swatchSize + 10, y);
    y += 18;

    if (c.sections && c.sections.length > 0) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(100, 110, 110);
      const secLine = c.sections.join(" · ");
      const secLines = doc.splitTextToSize(secLine, inner - 40) as string[];
      for (const line of secLines) {
        doc.text(line, (pageW - doc.getTextWidth(line)) / 2, y);
        y += 12;
      }
      doc.setFontSize(13);
      doc.setTextColor(26, 46, 46);
      y += 4;
    }
  }

  // Completion date
  const completedDateStr = params.completedAtIso
    ? new Date(params.completedAtIso).toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString();

  y = pageH - margin - 56;
  doc.setDrawColor(11, 191, 191);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 80, y, pageW / 2 + 80, y);
  y += 16;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(26, 46, 46);
  const dateLine = `Completed ${completedDateStr}`;
  doc.text(dateLine, (pageW - doc.getTextWidth(dateLine)) / 2, y);

  y += 14;
  doc.setTextColor(120, 120, 120);
  const footer = "Issued by Fab Collab · fabcollab.vercel.app";
  doc.text(footer, (pageW - doc.getTextWidth(footer)) / 2, y);

  return doc.output("blob");
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m.split("").map((c) => c + c).join("")
      : m.slice(0, 6);
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return [11, 191, 191];
  return [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff];
}
