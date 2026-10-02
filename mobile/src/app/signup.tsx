import { router } from "expo-router";
import { useState } from "react";
import { Button, ErrorText, Field, Muted, Screen } from "@/components/ui";
import { notify } from "@/lib/documents";
import { cleanMobile, isMobile } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { errorText, supabase } from "@/lib/supabase";

export default function SignUp() {
  const { t } = useI18n();
  const [form, setForm] = useState({ fullName: "", mobile: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = t("required");
    if (!isMobile(form.mobile)) e.mobile = t("invalidMobile");
    if (!form.email.trim()) e.email = t("required");
    if (form.password.length < 6) e.password = t("passwordHint");
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.fullName.trim(), mobile: cleanMobile(form.mobile) } },
    });
    setBusy(false);
    if (error) return setError(errorText(error));
    if (!data.session) {
      // Email confirmation is switched on for this project.
      notify(t("checkEmail"));
      return router.replace("/login");
    }
    router.replace("/");
  }

  return (
    <Screen>
      <Muted style={{ marginBottom: 16 }}>{t("shopDetailsIntro")}</Muted>
      <ErrorText>{error}</ErrorText>
      <Field label={t("fullName")} value={form.fullName} onChangeText={set("fullName")} error={errors.fullName} autoComplete="name" />
      <Field
        label={t("mobile")}
        value={form.mobile}
        onChangeText={set("mobile")}
        error={errors.mobile}
        keyboardType="phone-pad"
        maxLength={14}
        autoComplete="tel"
      />
      <Field
        label={t("email")}
        value={form.email}
        onChangeText={set("email")}
        error={errors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label={t("password")}
        value={form.password}
        onChangeText={set("password")}
        error={errors.password}
        hint={t("passwordHint")}
        secureTextEntry
        autoComplete="new-password"
      />
      <Button title={t("signUp")} onPress={submit} loading={busy} />
      <Button title={t("haveAccount")} variant="ghost" onPress={() => router.replace("/login")} />
    </Screen>
  );
}
