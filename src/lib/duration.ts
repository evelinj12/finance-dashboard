const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

const UNIT_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(hours?|hrs?|hr|h|minutes?|mins?|min|m|seconds?|secs?|sec|s)\b/gi;

function decimalNumber(value: string) {
  return Number(value.replace(",", "."));
}

function hoursFromSeconds(seconds: number) {
  return Number((seconds / SECONDS_PER_HOUR).toFixed(4));
}

export function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => part.trim());
    if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) return null;

    const [hours, minutes, seconds = 0] = parts.map(Number);
    if (minutes >= MINUTES_PER_HOUR || seconds >= SECONDS_PER_MINUTE) return null;
    return hoursFromSeconds(hours * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE + seconds);
  }

  const unitMatches = Array.from(trimmed.matchAll(UNIT_PATTERN));
  if (unitMatches.length > 0) {
    const normalizedInput = trimmed.toLowerCase().replace(/\s+/g, "");
    const normalizedMatches = unitMatches.map((match) => match[0].toLowerCase().replace(/\s+/g, "")).join("");
    if (normalizedInput !== normalizedMatches) return null;

    let seconds = 0;
    for (const match of unitMatches) {
      const amount = decimalNumber(match[1]);
      if (!Number.isFinite(amount) || amount < 0) return null;

      const unit = match[2].toLowerCase();
      if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) seconds += amount * SECONDS_PER_HOUR;
      if (["m", "min", "mins", "minute", "minutes"].includes(unit)) seconds += amount * SECONDS_PER_MINUTE;
      if (["s", "sec", "secs", "second", "seconds"].includes(unit)) seconds += amount;
    }
    return hoursFromSeconds(seconds);
  }

  const bareNumber = decimalNumber(trimmed);
  if (!Number.isFinite(bareNumber) || bareNumber < 0) return null;

  if (Number.isInteger(bareNumber) && bareNumber >= 24) {
    return hoursFromSeconds(bareNumber * SECONDS_PER_MINUTE);
  }

  return bareNumber;
}

export function formatHoursAsDuration(hours: number | null | undefined) {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return "-";

  const sign = hours < 0 ? "-" : "";
  const totalSeconds = Math.round(Math.abs(hours) * SECONDS_PER_HOUR);
  const wholeHours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  return `${sign}${String(wholeHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDecimalHours(hours: number | null | undefined) {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return "-";
  return hours.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function durationInputHint(value: string) {
  const parsed = parseDurationInput(value);
  if (value.trim() === "" || parsed === null) return null;
  return `${formatHoursAsDuration(parsed)} | ${formatDecimalHours(parsed)} decimal hours`;
}
