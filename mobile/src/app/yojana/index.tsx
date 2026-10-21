import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, Card, Empty, ErrorText, Field, H2, ListItem, Muted, Screen } from "@/components/ui";
import { cleanMobile, dateIST, isMobile } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { errorText, supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import type { Family } from "@/lib/yojana";
import { must, useLoad } from "@/lib/use-load";

// The retailer's screened families, and a new family after consent.
export default function YojanaFamilies() {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const { data, error, refreshing, refresh } = useLoad(async () => {
    const res = await supabase
      .from("families")
      .select("id, family_name, mobile, village, answers, consent_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    return must(res) as Family[];
  });

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ErrorText>{error}</ErrorText>
      {adding || (data && data.length === 0) ? (
        <NewFamily onCancel={data?.length ? () => setAdding(false) : undefined} />
      ) : (
        <Button title={`+  ${t("newFamily")}`} variant="yellow" onPress={() => setAdding(true)} />
      )}
      <H2>{t("yojanaFamilies")}</H2>
      <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: colors.white }}>
        {data && data.length === 0 ? <Empty text={t("noFamilies")} /> : null}
        {data?.map((f) => (
          <ListItem
            key={f.id}
            title={f.family_name}
            subtitle={[f.mobile, f.village, dateIST(f.updated_at)].filter(Boolean).join(" · ")}
            onPress={() => router.push(`/yojana/${f.id}`)}
            right={<Ionicons name="chevron-forward" size={18} color={colors.muted} />}
          />
        ))}
      </View>
    </Screen>
  );
}

function NewFamily({ onCancel }: { onCancel?: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", family: "", mobile: "", village: "" });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = t("required");
    if (form.mobile.trim() && !isMobile(form.mobile)) e.mobile = t("invalidMobile");
    setErrors(e);
    if (Object.keys(e).length) return;
    if (!consent) return setError(t("consentNeeded"));
    setBusy(true);
    setError(null);
    const name = form.name.trim();
    const { data: fam, error: fErr } = await supabase
      .from("families")
      .insert({
        family_name: form.family.trim() || name,
        mobile: form.mobile.trim() ? cleanMobile(form.mobile) : null,
        village: form.village.trim() || null,
        consent_method: "verbal",
      })
      .select("id")
      .single();
    if (fErr || !fam) {
      setBusy(false);
      return setError(errorText(fErr));
    }
    const { error: mErr } = await supabase.from("family_members").insert({ family_id: fam.id, full_name: name, relation: "self" });
    setBusy(false);
    if (mErr) return setError(errorText(mErr));
    router.replace({ pathname: "/yojana/answers", params: { id: fam.id } });
  }

  return (
    <Card>
      <H2>{t("newFamily")}</H2>
      <ErrorText>{error}</ErrorText>
      <Field label={t("personName")} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} error={errors.name} />
      <Field label={t("familyName")} value={form.family} onChangeText={(v) => setForm({ ...form, family: v })} />
      <Field
        label={t("mobile")}
        value={form.mobile}
        onChangeText={(v) => setForm({ ...form, mobile: v })}
        error={errors.mobile}
        keyboardType="phone-pad"
        maxLength={14}
      />
      <Field label={t("village")} value={form.village} onChangeText={(v) => setForm({ ...form, village: v })} />
      <Pressable
        onPress={() => setConsent(!consent)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        style={{ flexDirection: "row", gap: 10, backgroundColor: colors.blueLight, borderRadius: 12, padding: 12, marginBottom: 14 }}
      >
        <Ionicons name={consent ? "checkbox" : "square-outline"} size={24} color={colors.blue} />
        <Text style={{ flex: 1, color: colors.text }}>{t("consentText")}</Text>
      </Pressable>
      <Button title={t("startCheck")} onPress={start} loading={busy} />
      {onCancel ? <Button title={t("cancel")} variant="ghost" onPress={onCancel} /> : null}
      <Muted style={{ marginTop: 6 }}>{t("yojanaCheckHint")}</Muted>
    </Card>
  );
}
