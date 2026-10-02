// Public project settings. The publishable key is meant to ship inside the app;
// the database's row-level security decides what each login can see.
// Never put the service_role key here.
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://neibaqrgnvociaxatzan.supabase.co";
export const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "sb_publishable_Uix6rYBQvNlyZfhTtoJzaA_j49PR8nZ";

export const DOCUMENTS_BUCKET = "request-documents";

/** OMSUN office number for the "Call Office" button. Leave empty to hide it. */
export const OFFICE_PHONE = process.env.EXPO_PUBLIC_OFFICE_PHONE ?? "";

/** Public pages the app links to (Play Store requires both). */
export const PRIVACY_URL = "https://omsunesewakendra.com/privacy";
