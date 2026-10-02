import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Image, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LanguageSwitch } from "@/components/language-switch";
import { Button, Card, Muted, styles } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

/** Shown while the shop waits for approval, or when this login can't use the app. */
export default function Pending() {
  const { t } = useI18n();
  const { session, profile, retailer, refresh, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!session) return <Redirect href="/login" />;

  let title: string = t("awaitingApproval");
  let body: string = t("awaitingApprovalBody");
  if (profile && !profile.is_active) {
    title = t("accountInactive");
    body = "";
  } else if (profile && profile.role !== "retailer") {
    title = t("notRetailer");
    body = "";
  } else if (retailer?.status === "rejected") {
    title = t("accountRejected");
    body = t("accountRejectedBody");
  } else if (retailer?.status === "suspended") {
    title = t("accountSuspended");
    body = t("accountSuspendedBody");
  }

  async function check() {
    setBusy(true);
    await refresh();
    setBusy(false);
    router.replace("/");
  }

  return (
    <SafeAreaView style={[styles.screen, { padding: 24 }]}>
      <View style={{ alignItems: "flex-end" }}>
        <LanguageSwitch />
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <Image source={require("../../assets/omsun-emblem.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
        </View>
        <Card>
          <Text style={[styles.h1, { color: colors.blue }]}>{title}</Text>
          {body ? <Muted>{body}</Muted> : null}
          {retailer ? (
            <Text style={{ marginTop: 12, fontWeight: "600" }}>
              {retailer.business_name} · {retailer.mobile}
            </Text>
          ) : null}
        </Card>
        <Button title={t("checkAgain")} onPress={check} loading={busy} />
        <Button title={t("logOut")} variant="ghost" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}
