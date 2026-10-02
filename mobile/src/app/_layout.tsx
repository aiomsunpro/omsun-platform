import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

function RootStack() {
  const { t } = useI18n();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.blue },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: t("signUp") }} />
      <Stack.Screen name="register-shop" options={{ title: t("shopDetails"), headerBackVisible: false }} />
      <Stack.Screen name="pending" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="new-request" options={{ title: t("newRequest") }} />
      <Stack.Screen name="request/[id]" options={{ title: t("requests") }} />
      <Stack.Screen name="services" options={{ title: t("servicesAndPrices") }} />
      <Stack.Screen name="customers" options={{ title: t("myCustomers") }} />
      <Stack.Screen name="notifications" options={{ title: t("notifications") }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootStack />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
