// lib/format.ts

export function formatDate(dateString: string | Date) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  })
    .format(date)
    .replace(/\//g, "-"); // Output: 04-11-2026
}

export function formatDateTime(dateString: string | Date) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // Format 24 Jam
    timeZone: "Asia/Jakarta",
  })
    .format(date)
    .replace(/\//g, "-"); // Output: 04-11-2026, 14:30
}
