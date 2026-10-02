import type { RequestStatus } from "./types";

// OMSUN brand: blue (from the logo), white and yellow.
export const colors = {
  blue: "#3E4FAB",
  blueDark: "#2E3C87",
  blueLight: "#E8EBF8",
  yellow: "#F5B800",
  yellowLight: "#FFF6D6",
  white: "#FFFFFF",
  bg: "#F5F7FC",
  text: "#111827",
  muted: "#6B7280",
  border: "#E2E6F0",
  green: "#15803D",
  greenLight: "#DCFCE7",
  red: "#B91C1C",
  redLight: "#FEE2E2",
  orange: "#C2410C",
  orangeLight: "#FFEDD5",
  grey: "#4B5563",
  greyLight: "#E5E7EB",
};

export const statusColors: Record<RequestStatus, { fg: string; bg: string }> = {
  new: { fg: colors.blue, bg: colors.blueLight },
  assigned: { fg: colors.blue, bg: colors.blueLight },
  documents_required: { fg: colors.orange, bg: colors.orangeLight },
  documents_received: { fg: colors.blueDark, bg: colors.blueLight },
  under_process: { fg: "#8A6100", bg: colors.yellowLight },
  pending: { fg: "#8A6100", bg: colors.yellowLight },
  completed: { fg: colors.green, bg: colors.greenLight },
  rejected: { fg: colors.red, bg: colors.redLight },
  cancelled: { fg: colors.grey, bg: colors.greyLight },
};

export const OPEN_STATUSES: RequestStatus[] = [
  "new",
  "assigned",
  "documents_required",
  "documents_received",
  "under_process",
  "pending",
];

export const FINAL_STATUSES: RequestStatus[] = ["completed", "rejected", "cancelled"];

/** Soft card shadow (Android elevation + iOS/web shadow). */
export const shadow = {
  shadowColor: "#1E2A6B",
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

/** Light tinted tile background used on the home grid. */
export const tile = "#EEF0FA";
