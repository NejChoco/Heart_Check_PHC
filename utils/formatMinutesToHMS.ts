/**
 * Converts a duration in minutes (can include a fractional part, e.g. 14.3)
 * into a formal hh:mm:ss string for display.
 *
 * Examples:
 *   formatMinutesToHMS(5)      -> "00:05:00"
 *   formatMinutesToHMS(14.3)   -> "00:14:18"
 *   formatMinutesToHMS(114.75) -> "01:54:45"
 *   formatMinutesToHMS(0)      -> "00:00:00"
 */
export function formatMinutesToHMS(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0) {
    return "00:00:00";
  }

  const totalSeconds = Math.round(minutes * 60);
  const hrs  = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}