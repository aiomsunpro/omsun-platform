import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

/** Blue header with rounded bottom corners, matching the home screen. */
export function TabHero({ title, children }: { title: string; children?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: colors.blue,
        paddingTop: insets.top + 14,
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        marginBottom: 12,
      }}
    >
      <Text style={{ color: colors.white, fontSize: 22, fontWeight: "800", marginBottom: children ? 14 : 0 }}>{title}</Text>
      {children}
    </View>
  );
}
