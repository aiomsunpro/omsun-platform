import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";
import { colors, shadow } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, [IconName, IconName]> = {
  index: ["home", "home-outline"],
  requests: ["document-text", "document-text-outline"],
  earnings: ["wallet", "wallet-outline"],
  profile: ["person-circle", "person-circle-outline"],
};

/**
 * PhonePe-style floating bar: two tabs, a big "New Request" pill in the middle, two tabs.
 */
export function FloatingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { t } = useI18n();

  const tab = (index: number) => {
    const route = state.routes[index];
    if (!route) return null;
    const focused = state.index === index;
    const label = descriptors[route.key].options.title ?? route.name;
    const [on, off] = ICONS[route.name] ?? ["ellipse", "ellipse-outline"];
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={{ flex: 1, alignItems: "center", paddingVertical: 6 }}
      >
        <Ionicons name={focused ? on : off} size={24} color={focused ? colors.blue : colors.muted} />
        <Text numberOfLines={1} style={{ fontSize: 11, marginTop: 2, fontWeight: focused ? "800" : "600", color: focused ? colors.blue : colors.muted }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ position: "absolute", left: 12, right: 12, bottom: Math.max(insets.bottom, 10) }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.white,
          borderRadius: 32,
          paddingHorizontal: 6,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadow,
        }}
      >
        {tab(0)}
        {tab(1)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("newRequest")}
          onPress={() => router.push("/new-request")}
          style={({ pressed }) => ({
            flex: 2,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: pressed ? colors.blueDark : colors.blue,
            borderRadius: 26,
            paddingVertical: 14,
            marginHorizontal: 4,
          })}
        >
          <Ionicons name="add-circle" size={22} color={colors.yellow} />
          <Text numberOfLines={1} style={{ color: colors.white, fontWeight: "800", fontSize: 15 }}>
            {t("barNew")}
          </Text>
        </Pressable>
        {tab(2)}
        {tab(3)}
      </View>
    </View>
  );
}

/** Space to leave at the bottom of tab screens so content clears the floating bar. */
export const TAB_BAR_SPACE = 110;
