import * as chrono from 'chrono-node';

// Numeric dates like 03/04 mean different days depending on locale. We refuse
// to guess: the caller is told it is ambiguous and stores no due date.
const AMBIGUOUS_NUMERIC = /\b(\d{1,2})[/-](\d{1,2})(?![/-]\d)\b/;

// Dates are parsed deterministically from text, never asked of the model.
// reference is the email's received_at, so 'Friday' resolves correctly.
export function extractDates(text, reference) {
  const ref = reference instanceof Date ? reference : new Date(reference);
  const results = chrono.parse(text, ref, { forwardDate: true });

  const dates = results.map((r) => {
    const bothSmall = AMBIGUOUS_NUMERIC.exec(r.text);
    const ambiguous = Boolean(
      bothSmall && Number(bothSmall[1]) <= 12 && Number(bothSmall[2]) <= 12,
    );

    return {
      text: r.text,
      iso: ambiguous ? null : r.start.date().toISOString(),
      ambiguous,
      has_time: r.start.isCertain('hour'),
    };
  });

  return dates;
}

// The soonest unambiguous date, or null.
export function earliestDate(dates) {
  const usable = dates.filter((d) => d.iso && !d.ambiguous).map((d) => d.iso).sort();
  return usable[0] ?? null;
}

export function hoursUntil(iso, now = new Date()) {
  if (!iso) return null;
  return (new Date(iso).getTime() - now.getTime()) / 3_600_000;
}
