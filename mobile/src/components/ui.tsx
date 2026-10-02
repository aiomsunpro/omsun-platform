import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "@/lib/i18n";
import { colors, statusColors } from "@/lib/theme";
import type { RequestStatus } from "@/lib/types";

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ["bottom"],
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: ("top" | "bottom")[];
  refreshControl?: React.ReactElement<any>;
}) {
  const inner = padded ? styles.padded : undefined;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={inner}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "yellow" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.blue, fg: colors.white, border: colors.blue },
  secondary: { bg: colors.white, fg: colors.blue, border: colors.blue },
  yellow: { bg: colors.yellow, fg: colors.text, border: colors.yellow },
  danger: { bg: colors.white, fg: colors.red, border: colors.red },
  ghost: { bg: "transparent", fg: colors.blue, border: "transparent" },
};

export function Field({
  label,
  error,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, input.multiline && { minHeight: 80, textAlignVertical: "top" }, error ? { borderColor: colors.red } : null]}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Muted style={{ marginTop: 4 }}>{hint}</Muted> : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={{ color: colors.red }}>{children}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { statusLabel } = useI18n();
  const c = statusColors[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export function Pill({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.blue, borderColor: colors.blue }]}
    >
      <Text style={{ color: active ? colors.white : colors.text, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontWeight: "700", color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.blue} />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: 32, alignItems: "center" }}>
      <Muted style={{ textAlign: "center" }}>{text}</Muted>
    </View>
  );
}

export function ListItem({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listItem, pressed && onPress && { backgroundColor: colors.blueLight }]}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={styles.listTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.muted} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  padded: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h1: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  h2: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 14 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.red, marginTop: 4, fontSize: 13 },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 10, padding: 12, marginBottom: 12 },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 10,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 12, marginBottom: 0 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  rowLabel: { color: colors.muted, fontSize: 14, flex: 1 },
  rowValue: { color: colors.text, fontSize: 14, textAlign: "right", flexShrink: 1 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listTitle: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 2 },
});
