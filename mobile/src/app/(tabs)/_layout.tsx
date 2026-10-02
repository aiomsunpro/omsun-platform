import { Redirect } from "expo-router";
import Tabs from "expo-router/js-tabs";
import { FloatingTabBar } from "@/components/floating-tab-bar";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const { t } = useI18n();
  const { ready, session, retailer } = useAuth();
  if (ready && (!session || retailer?.status !== "approved")) return <Redirect href="/" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.blue },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("home") }} />
      <Tabs.Screen name="requests" options={{ title: t("requests") }} />
      <Tabs.Screen name="earnings" options={{ title: t("earnings") }} />
      <Tabs.Screen name="profile" options={{ title: t("profile") }} />
    </Tabs>
  );
}
