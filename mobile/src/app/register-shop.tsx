import { router } from "expo-router";
import { useState } from "react";
import { Button, ErrorText, Field, Muted, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { cleanMobile, isMobile } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { errorText, supabase } from "@/lib/supabase";

type Form = {
  business_name: string;
  owner_name: string;
  mobile: string;
  business_type: string;
  village: string;
  taluka: string;
  district: string;
  pincode: string;
  address: string;
};

export default function RegisterShop() {
  const { t } = useI18n();
  const { session, profile, refresh, signOut } = useAuth();
  const meta = (session?.user.user_metadata ?? {}) as { full_name?: string; mobile?: string };
  const [form, setForm] = useState<Form>({
    business_name: "",
    owner_name: profile?.full_name ?? meta.full_name ?? "",
    mobile: profile?.mobile ?? meta.mobile ?? "",
    business_type: "",
    village: "",
    taluka: "",
    district: "Dharashiv",
    pincode: "",
    address: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.business_name.trim()) e.business_name = t("required");
    if (!form.owner_name.trim()) e.owner_name = t("required");
    if (!isMobile(form.mobile)) e.mobile = t("invalidMobile");
    if (!form.village.trim()) e.village = t("required");
    if (!form.taluka.trim()) e.taluka = t("required");
    setErrors(e);
    if (Object.keys(e).length || !session) return;

    setBusy(true);
    setError(null);
    const mobile = cleanMobile(form.mobile);
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ full_name: form.owner_name.trim(), mobile })
      .eq("id", session.user.id);
    if (pErr) {
      setBusy(false);
      return setError(pErr.code === "23505" ? t("mobileTaken") : errorText(pErr));
    }
    const trimmed = Object.fromEntries(
      Object.entries({ ...form, mobile }).map(([k, v]) => [k, v.trim() || null]),
    );
    const { error: rErr } = await supabase.from("retailers").insert(trimmed);
    setBusy(false);
    if (rErr) return setError(rErr.code === "23505" ? t("mobileTaken") : errorText(rErr));
    await refresh();
    router.replace("/");
  }

  return (
    <Screen>
      <Muted style={{ marginBottom: 16 }}>{t("shopDetailsIntro")}</Muted>
      <ErrorText>{error}</ErrorText>
      <Field label={t("businessName")} value={form.business_name} onChangeText={set("business_name")} error={errors.business_name} />
      <Field label={t("ownerName")} value={form.owner_name} onChangeText={set("owner_name")} error={errors.owner_name} />
      <Field label={t("mobile")} value={form.mobile} onChangeText={set("mobile")} error={errors.mobile} keyboardType="phone-pad" maxLength={14} />
      <Field label={t("businessType")} value={form.business_type} onChangeText={set("business_type")} placeholder={t("businessTypeHint")} />
      <Field label={t("village")} value={form.village} onChangeText={set("village")} error={errors.village} />
      <Field label={t("taluka")} value={form.taluka} onChangeText={set("taluka")} error={errors.taluka} />
      <Field label={t("district")} value={form.district} onChangeText={set("district")} />
      <Field label={t("pincode")} value={form.pincode} onChangeText={set("pincode")} keyboardType="number-pad" maxLength={6} />
      <Field label={t("address")} value={form.address} onChangeText={set("address")} multiline />
      <Button title={t("submitForApproval")} onPress={submit} loading={busy} />
      <Button title={t("logOut")} variant="ghost" onPress={signOut} />
    </Screen>
  );
}
