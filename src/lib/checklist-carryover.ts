export interface ChecklistCarryoverSource {
  title: string;
  latest_date_note: string | null;
  sort_order: number;
}

export function buildChecklistCarryoverItems(month: string, items: ChecklistCarryoverSource[]) {
  return items.map((item) => ({
    month,
    title: item.title,
    latest_date_note: item.latest_date_note,
    completed: false,
    sort_order: item.sort_order,
  }));
}
