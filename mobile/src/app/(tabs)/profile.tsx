import Constants from "expo-constants";
import { router } from "expo-router";
import { Linking, Text, View } from "react-native";
import { LanguageSwitch } from "@/components/language-switch";
import { Button, Card, H2, ListItem, Muted, Row, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { OFFICE_PHONE } from "@/lib/config";
import { dateIST } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

export default function Profile() {
  const { t } = useI18n();
  const { profile, retailer, signOut } = useAuth();
  const place = [retailer?.village, retailer?.taluka, retailer?.district].filter(Boolean).join(", ");

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{profile?.full_name}</Text>
        <Muted>{profile?.email}</Muted>
      </Card>

      <H2>{t("myShop")}</H2>
      <Card>
        <Row label={t("businessName")} value={retailer?.business_name ?? ""} />
        <Row label={t("ownerName")} value={retailer?.owner_name ?? ""} />
        <Row label={t("mobile")} value={retailer?.mobile ?? ""} />
        {retailer?.business_type ? <Row label={t("businessType")} value={retailer.business_type} /> : null}
        {place ? <Row label={t("village")} value={place} /> : null}
        {retailer?.joined_on ? <Row label={t("joinedOn")} value={dateIST(retailer.joined_on)} /> : null}
      </Card>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 8 }}>
        <H2>{t("language")}</H2>
        <LanguageSwitch />
      </View>

      <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border, marginVertical: 8 }}>
        <ListItem title={t("myCustomers")} right={<Text style={{ color: colors.muted }}>›</Text>} onPress={() => router.push("/customers")} />
        <ListItem title={t("servicesAndPrices")} right={<Text style={{ color: colors.muted }}>›</Text>} onPress={() => router.push("/services")} />
        <ListItem title={t("notifications")} right={<Text style={{ color: colors.muted }}>›</Text>} onPress={() => router.push("/notifications")} />
      </View>

      {OFFICE_PHONE ? (
        <Button title={t("callOffice")} variant="secondary" onPress={() => Linking.openURL(`tel:${OFFICE_PHONE}`)} />
      ) : null}
      <Button title={t("logOut")} variant="danger" onPress={signOut} />
      <Muted style={{ textAlign: "center", marginTop: 8 }}>
        {t("appVersion")} {Constants.expoConfig?.version}
      </Muted>
    </Screen>
  );
}
