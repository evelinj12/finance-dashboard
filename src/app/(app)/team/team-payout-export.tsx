"use client";

import { useMemo, useState } from "react";
import { Download, FileImage, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/currency";
import type { TeamWorkStatus } from "@/lib/supabase/types";

interface RelatedName {
  name: string;
  type?: string;
}

interface TeamMemberOption {
  id: string;
  name: string;
  active: boolean;
}

interface TeamPayoutEntry {
  id: string;
  team_member_id: string;
  income_source_id: string | null;
  date: string;
  description: string | null;
  work_period: string | null;
  hours: number | null;
  amount_idr: number;
  status: TeamWorkStatus;
  notes: string | null;
  team_member: RelatedName | RelatedName[] | null;
  income_source: RelatedName | RelatedName[] | null;
}

type ExportStatus = TeamWorkStatus | "all";
type ExportFormat = "image" | "pdf";

const statusLabels: Record<ExportStatus, string> = {
  all: "All entries",
  need_approval: "Need approval",
  owed: "Owed",
  paid: "Transferred",
};

function relatedName(value: RelatedName | RelatedName[] | null): string {
  if (Array.isArray(value)) return value[0]?.name ?? "-";
  return value?.name ?? "-";
}

function formatDuration(hours: number | null | undefined) {
  const safeHours = Number.isFinite(hours) ? Number(hours) : 0;
  const totalSeconds = Math.max(0, Math.round(safeHours * 3600));
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  return [hh, mm, ss].map((part) => String(part).padStart(2, "0")).join(":");
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}T00:00:00Z`)
  );
}

function fileSafe(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrapText(value: string, maxChars: number, maxLines = 2) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, maxChars - 1)).trimEnd()}...`;
  }

  return lines.length > 0 ? lines : ["-"];
}

function groupByClient(entries: TeamPayoutEntry[]) {
  const groups = new Map<string, { client: string; hours: number; amountIdr: number; count: number }>();

  for (const entry of entries) {
    const client = entry.income_source_id ? relatedName(entry.income_source) : "No client";
    const current = groups.get(client) ?? { client, hours: 0, amountIdr: 0, count: 0 };
    current.hours += entry.hours ?? 0;
    current.amountIdr += entry.amount_idr;
    current.count += 1;
    groups.set(client, current);
  }

  return Array.from(groups.values()).sort((a, b) => a.client.localeCompare(b.client));
}

function textLine(x: number, y: number, value: string, className: string, anchor: "start" | "end" = "start") {
  return `<text x="${x}" y="${y}"${anchor === "end" ? ' text-anchor="end"' : ""} class="${className}">${escapeXml(value)}</text>`;
}

function createReportSvg({
  entries,
  memberName,
  month,
  status,
}: {
  entries: TeamPayoutEntry[];
  memberName: string;
  month: string;
  status: ExportStatus;
}) {
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours ?? 0), 0);
  const totalAmountIdr = entries.reduce((sum, entry) => sum + entry.amount_idr, 0);
  const clientGroups = groupByClient(entries);
  const rowHeight = 110;
  const summaryHeight = Math.max(1, clientGroups.length) * 116 + 90;
  const detailsHeight = Math.max(1, entries.length) * rowHeight + 110;
  const height = Math.max(1180, 72 + 190 + 48 + 180 + 56 + summaryHeight + 56 + detailsHeight + 120);
  const generatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const width = 1080;
  const cardHeight = height - 144;
  const summaryY = 540;
  const detailsY = summaryY + summaryHeight + 56;

  const summaryBlocks =
    clientGroups.length > 0
      ? clientGroups
          .map((group, index) => {
            const y = 36 + index * 116;
            return `
              <rect x="0" y="${y}" width="840" height="96" rx="18" fill="${index === 0 ? "#F2FBF8" : "#F8FDFF"}" stroke="${index === 0 ? "#BDEDD9" : "#D7ECF7"}"/>
              ${textLine(28, y + 38, group.client, "body")}
              ${textLine(28, y + 72, `${formatDuration(group.hours)} billing duration`, "muted")}
              ${textLine(812, y + 42, formatMoney(group.amountIdr, "IDR"), "body", "end")}
              ${textLine(812, y + 74, `${group.count} ${group.count === 1 ? "entry" : "entries"}`, "small", "end")}
            `;
          })
          .join("")
      : `
          <rect x="0" y="36" width="840" height="96" rx="18" fill="#F8FDFF" stroke="#D7ECF7"/>
          ${textLine(28, 94, "No entries match this report filter.", "muted")}
        `;

  const detailRows =
    entries.length > 0
      ? entries
          .map((entry, index) => {
            const y = 128 + index * rowHeight;
            const client = entry.income_source_id ? relatedName(entry.income_source) : "No client";
            const note = entry.notes || entry.description || "-";
            const noteLines = wrapText(note, 32, 2);
            return `
              <g transform="translate(0 ${y})">
                ${textLine(28, 42, entry.date, "body")}
                ${textLine(190, 34, client, "body")}
                ${noteLines.map((line, lineIndex) => textLine(190, 68 + lineIndex * 28, line, "muted")).join("")}
                ${textLine(640, 42, formatDuration(entry.hours), "body", "end")}
                ${textLine(812, 42, formatMoney(entry.amount_idr, "IDR"), "body", "end")}
                ${index < entries.length - 1 ? '<line x1="0" y1="94" x2="840" y2="94" class="line"/>' : ""}
              </g>
            `;
          })
          .join("")
      : `
          <g transform="translate(0 128)">
            ${textLine(28, 42, "No entries", "muted")}
          </g>
        `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#DDF7FF"/>
          <stop offset="1" stop-color="#F7FCFF"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#075985" flood-opacity="0.14"/>
        </filter>
        <style>
          .font { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .title { font-size: 48px; font-weight: 800; fill: #071f37; }
          .section { font-size: 26px; font-weight: 800; fill: #071f37; }
          .label { font-size: 20px; font-weight: 700; fill: #587087; letter-spacing: 1px; }
          .body { font-size: 24px; font-weight: 600; fill: #0b263f; }
          .muted { font-size: 22px; font-weight: 500; fill: #64798d; }
          .amount { font-size: 38px; font-weight: 850; fill: #059669; }
          .small { font-size: 19px; font-weight: 600; fill: #64798d; }
          .line { stroke: #D7ECF7; stroke-width: 2; }
        </style>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect x="72" y="72" width="936" height="${cardHeight}" rx="34" fill="#FFFFFF" filter="url(#shadow)"/>
      <g class="font">
        <rect x="72" y="72" width="936" height="190" rx="34" fill="#F3FBFF"/>
        ${textLine(120, 160, "Team payout report", "title")}
        ${textLine(120, 208, "Transfer summary for approved work", "muted")}
        ${textLine(840, 142, "REPORT MONTH", "label", "end")}
        ${textLine(840, 180, formatMonth(month), "body", "end")}
        ${textLine(840, 220, `Generated ${generatedAt}`, "small", "end")}

        <g transform="translate(120 310)">
          <rect x="0" y="0" width="840" height="180" rx="24" fill="#F8FDFF" stroke="#D7ECF7"/>
          ${textLine(36, 52, "TEAM MEMBER", "label")}
          ${textLine(36, 94, memberName, "section")}
          ${textLine(36, 142, statusLabels[status], "muted")}
          ${textLine(804, 52, "TOTAL AMOUNT", "label", "end")}
          ${textLine(804, 102, formatMoney(totalAmountIdr, "IDR"), "amount", "end")}
          ${textLine(804, 142, `Billing duration ${formatDuration(totalHours)}`, "muted", "end")}
        </g>

        <g transform="translate(120 ${summaryY})">
          ${textLine(0, 0, "Summary by client", "section")}
          ${summaryBlocks}
        </g>

        <g transform="translate(120 ${detailsY})">
          ${textLine(0, 0, "Entry details", "section")}
          <rect x="0" y="36" width="840" height="72" rx="18" fill="#EFF8FD"/>
          ${textLine(28, 82, "DATE", "label")}
          ${textLine(190, 82, "CLIENT & NOTE", "label")}
          ${textLine(640, 82, "DURATION", "label", "end")}
          ${textLine(812, 82, "AMOUNT", "label", "end")}
          ${detailRows}
        </g>

        <g transform="translate(120 ${height - 88})">
          <rect x="0" y="0" width="840" height="1" fill="#D7ECF7"/>
          ${textLine(0, 44, "This report summarizes team payout entries for transfer reference.", "small")}
        </g>
      </g>
    </svg>
  `;
}

async function svgToCanvas(svg: string, scale = 2) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  try {
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth * scale;
    canvas.height = image.naturalHeight * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare export canvas");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to create export file"));
      },
      type,
      quality
    );
  });
}

function makePdfFromJpeg(jpegBinary: string, width: number, height: number) {
  const pageWidth = 612;
  const pageHeight = Math.round((pageWidth * height) / width);
  const contentStream = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBinary.length} >>\nstream\n${jpegBinary}\nendstream`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index) & 0xff;
  }
  return new Blob([bytes], { type: "application/pdf" });
}

export function TeamPayoutExport({
  entries,
  members,
  selectedMonth,
}: {
  entries: TeamPayoutEntry[];
  members: TeamMemberOption[];
  selectedMonth: string;
}) {
  const membersWithEntries = useMemo(
    () => members.filter((member) => entries.some((entry) => entry.team_member_id === member.id)),
    [entries, members]
  );
  const defaultMemberId = membersWithEntries[0]?.id ?? members[0]?.id ?? "";
  const [memberId, setMemberId] = useState(defaultMemberId);
  const [status, setStatus] = useState<ExportStatus>("owed");
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const memberName = members.find((member) => member.id === memberId)?.name ?? "Team member";
  const reportEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.team_member_id === memberId)
      .filter((entry) => (status === "all" ? true : entry.status === status))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, memberId, status]);
  const totalHours = reportEntries.reduce((sum, entry) => sum + (entry.hours ?? 0), 0);
  const totalAmountIdr = reportEntries.reduce((sum, entry) => sum + entry.amount_idr, 0);
  const filenameBase = `team-payout-report-${fileSafe(memberName)}-${selectedMonth}-${status}`;

  async function exportReport(format: ExportFormat) {
    if (!memberId) {
      toast.error("Choose a team member first.");
      return;
    }
    if (reportEntries.length === 0) {
      toast.error("No entries match this report filter.");
      return;
    }

    setExporting(format);
    try {
      const svg = createReportSvg({ entries: reportEntries, memberName, month: selectedMonth, status });
      const canvas = await svgToCanvas(svg, format === "image" ? 2 : 1.5);

      if (format === "image") {
        const blob = await canvasToBlob(canvas, "image/png");
        downloadBlob(blob, `${filenameBase}.png`);
        toast.success("Image report exported");
      } else {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
        const jpegBinary = atob(dataUrl.split(",")[1] ?? "");
        const blob = makePdfFromJpeg(jpegBinary, canvas.width, canvas.height);
        downloadBlob(blob, `${filenameBase}.pdf`);
        toast.success("PDF report exported");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export report");
    } finally {
      setExporting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Team payout report</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Export a clean summary to send with transfer proof.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => exportReport("image")}
            disabled={exporting !== null || reportEntries.length === 0}
          >
            <FileImage className="size-4" />
            {exporting === "image" ? "Exporting..." : "Export image"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => exportReport("pdf")}
            disabled={exporting !== null || reportEntries.length === 0}
          >
            <FileText className="size-4" />
            {exporting === "pdf" ? "Exporting..." : "PDF"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.8fr_0.8fr] md:items-end">
          <div className="flex flex-col gap-2">
            <Label>Team member</Label>
            <Select value={memberId} onValueChange={(value) => setMemberId(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose member" />
              </SelectTrigger>
              <SelectContent>
                {(membersWithEntries.length > 0 ? membersWithEntries : members).map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Entries</Label>
            <Select value={status} onValueChange={(value) => setStatus((value as ExportStatus) ?? "owed")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owed">Owed</SelectItem>
                <SelectItem value="paid">Transferred</SelectItem>
                <SelectItem value="need_approval">Need approval</SelectItem>
                <SelectItem value="all">All entries</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billing duration</div>
            <div className="text-lg font-semibold">{formatDuration(totalHours)}</div>
          </div>
          <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total amount</div>
            <div className="text-lg font-semibold text-emerald-700">{formatMoney(totalAmountIdr, "IDR")}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Download className="size-4" />
          {reportEntries.length} {reportEntries.length === 1 ? "entry" : "entries"} for {formatMonth(selectedMonth)}
        </div>
      </CardContent>
    </Card>
  );
}
