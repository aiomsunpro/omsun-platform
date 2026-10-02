// Small helpers for reading Server Action form fields.
export const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const optional = (f: FormData, k: string) => field(f, k) || null;
export const amount = (f: FormData, k: string) => {
  const n = Number(field(f, k) || 0);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
