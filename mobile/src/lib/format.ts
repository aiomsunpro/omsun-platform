export function rupees(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return (n < 0 ? "-₹" : "₹") + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function dateIST(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** First day of the current month in India, as an ISO timestamp. */
export function monthStartIST() {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return new Date(Date.UTC(y, m, 1) - 5.5 * 3600 * 1000).toISOString();
}

/** Keeps the last 10 digits, so "+91 98765 43210" becomes "9876543210". */
export function cleanMobile(v: string) {
  return v.replace(/\D/g, "").slice(-10);
}

export function isMobile(v: string) {
  return /^[6-9]\d{9}$/.test(cleanMobile(v));
}
