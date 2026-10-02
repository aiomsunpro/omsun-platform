import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect } from "expo-router";
import Tabs from "expo-router/js-tabs";
import type { ColorValue } from "react-native";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const { t } = useI18n();
  const { ready, session, retailer } = useAuth();
  if (ready && (!session || retailer?.status !== "approved")) return <Redirect href="/" />;

  const icon = (name: IconName) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Ionicons name={name} color={color as string} size={size} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.blue },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("home"), headerTitle: t("appName"), tabBarIcon: icon("home") }} />
      <Tabs.Screen name="requests" options={{ title: t("requests"), tabBarIcon: icon("document-text") }} />
      <Tabs.Screen name="earnings" options={{ title: t("earnings"), tabBarIcon: icon("wallet") }} />
      <Tabs.Screen name="profile" options={{ title: t("profile"), tabBarIcon: icon("person-circle") }} />
    </Tabs>
  );
}
