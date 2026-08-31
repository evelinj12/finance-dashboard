export function shouldPrepareMonth(selectedMonth: string, currentMonth: string) {
  if (!/^\d{4}-\d{2}-01$/.test(selectedMonth)) return false;
  if (!/^\d{4}-\d{2}-01$/.test(currentMonth)) return false;
  return selectedMonth >= currentMonth;
}
