import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { Button, Loading, styles } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

/** Sends each login to the right place: log in, register the shop, wait for approval, or the app. */
export default function Gate() {
  const { ready, session, profile, retailer, loadError, refresh } = useAuth();
  const { t } = useI18n();

  if (!ready) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={[styles.muted, { marginBottom: 16, textAlign: "center" }]}>{t("error")}: {loadError}</Text>
        <Button title={t("retry")} onPress={refresh} />
      </View>
    );
  }
  if (!profile || profile.role !== "retailer" || !profile.is_active || !retailer) {
    if (profile?.role === "retailer" && profile.is_active && !retailer) return <Redirect href="/register-shop" />;
    return <Redirect href="/pending" />;
  }
  if (retailer.status !== "approved") return <Redirect href="/pending" />;
  return <Redirect href="/(tabs)" />;
}
