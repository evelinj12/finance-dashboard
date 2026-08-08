import { calculateClientNet } from "@/lib/finance/team-net";
import type { IncomePaymentStatus } from "@/lib/supabase/types";

interface RelatedSource {
  name: string;
  type?: string | null;
}

export interface IncomeSummaryTransaction {
  id: string;
  income_source_id: string;
  amount_idr: number;
  payment_status?: IncomePaymentStatus | null;
  status?: string | null;
  total_hours: number | null;
  income_source: RelatedSource | RelatedSource[] | null;
}

export interface IncomeSummaryTeamEntry {
  id: string;
  income_source_id: string | null;
  amount_idr: number;
  hours: number | null;
  income_source: RelatedSource | RelatedSource[] | null;
}

export interface IncomeClientSummaryRow {
  id: string;
  name: string;
  grossAmountIdr: number;
  grossHours: number;
  teamAmountIdr: number;
  teamHours: number;
  netAmountIdr: number;
  netHours: number;
}

export function incomePaymentStatusLabel(status: IncomePaymentStatus): string {
  return status === "paid" ? "Paid" : "Waiting";
}

export function normalizeIncomePaymentStatus(
  paymentStatus?: IncomePaymentStatus | null,
  legacyStatus?: string | null,
): IncomePaymentStatus {
  if (paymentStatus === "paid" || paymentStatus === "waiting") return paymentStatus;
  const normalizedLegacyStatus = legacyStatus?.trim().toLowerCase();
  if (["paid", "success", "completed", "complete"].includes(normalizedLegacyStatus ?? "")) return "paid";
  return "waiting";
}

export function relatedSourceName(value: RelatedSource | RelatedSource[] | null): string {
  if (Array.isArray(value)) return value[0]?.name ?? "-";
  return value?.name ?? "-";
}

function relatedSourceType(value: RelatedSource | RelatedSource[] | null): string | null {
  if (Array.isArray(value)) return value[0]?.type ?? null;
  return value?.type ?? null;
}

export function buildIncomeSummary({
  incomeTransactions,
  teamEntries,
}: {
  incomeTransactions: IncomeSummaryTransaction[];
  teamEntries: IncomeSummaryTeamEntry[];
}): {
  paidAmountIdr: number;
  waitingAmountIdr: number;
  clientRows: IncomeClientSummaryRow[];
} {
  let paidAmountIdr = 0;
  let waitingAmountIdr = 0;
  const clientSummary = new Map<
    string,
    Omit<IncomeClientSummaryRow, "netAmountIdr" | "netHours">
  >();

  for (const tx of incomeTransactions) {
    const paymentStatus = normalizeIncomePaymentStatus(tx.payment_status, tx.status);
    if (paymentStatus === "paid") {
      paidAmountIdr += tx.amount_idr;
    } else {
      waitingAmountIdr += tx.amount_idr;
    }

    if (relatedSourceType(tx.income_source) !== "freelance_client") continue;
    const current =
      clientSummary.get(tx.income_source_id) ??
      {
        id: tx.income_source_id,
        name: relatedSourceName(tx.income_source),
        grossAmountIdr: 0,
        grossHours: 0,
        teamAmountIdr: 0,
        teamHours: 0,
      };
    current.grossAmountIdr += tx.amount_idr;
    current.grossHours += tx.total_hours ?? 0;
    clientSummary.set(tx.income_source_id, current);
  }

  for (const entry of teamEntries) {
    if (!entry.income_source_id || relatedSourceType(entry.income_source) !== "freelance_client") continue;
    const current =
      clientSummary.get(entry.income_source_id) ??
      {
        id: entry.income_source_id,
        name: relatedSourceName(entry.income_source),
        grossAmountIdr: 0,
        grossHours: 0,
        teamAmountIdr: 0,
        teamHours: 0,
      };
    current.teamAmountIdr += entry.amount_idr;
    current.teamHours += entry.hours ?? 0;
    clientSummary.set(entry.income_source_id, current);
  }

  const clientRows = Array.from(clientSummary.values())
    .map((row) => {
      const net = calculateClientNet(row);
      return {
        ...row,
        netAmountIdr: net.netAmountIdr,
        netHours: net.netHours,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return { paidAmountIdr, waitingAmountIdr, clientRows };
}
