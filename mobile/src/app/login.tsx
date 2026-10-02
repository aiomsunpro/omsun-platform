import { Link, router } from "expo-router";
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorText, Field, Muted, styles } from "@/components/ui";
import { LanguageSwitch } from "@/components/language-switch";
import { notify } from "@/lib/documents";
import { useI18n } from "@/lib/i18n";
import { errorText, supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logIn() {
    setError(null);
    if (!email.trim() || !password) return setError(t("required"));
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return setError(errorText(error));
    router.replace("/");
  }

  async function forgot() {
    setError(null);
    if (!email.trim()) return setError(t("enterEmailFirst"));
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) return setError(errorText(error));
    notify(t("resetSent"));
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.white }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "flex-end" }}>
            <LanguageSwitch />
          </View>
          <View style={{ alignItems: "center", marginVertical: 24 }}>
            <Image
              source={require("../../assets/omsun-logo.png")}
              style={{ width: 240, height: 94 }}
              resizeMode="contain"
              accessibilityLabel="OMSUN E-Seva Kendra"
            />
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.blue, marginTop: 16 }}>{t("appName")}</Text>
            <Muted style={{ marginTop: 4 }}>{t("tagline")}</Muted>
          </View>

          <ErrorText>{error}</ErrorText>
          <Field
            label={t("email")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label={t("password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={logIn}
          />
          <Button title={t("logIn")} onPress={logIn} loading={busy} />
          <Pressable onPress={forgot} style={{ alignSelf: "center", padding: 8 }}>
            <Text style={{ color: colors.blue }}>{t("forgotPassword")}</Text>
          </Pressable>

          <View style={{ height: 16 }} />
          <Link href="/signup" asChild>
            <Pressable style={{ alignSelf: "center", padding: 8 }}>
              <Text style={{ color: colors.blue, fontWeight: "700" }}>{t("noAccount")}</Text>
            </Pressable>
          </Link>
          <Muted style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>{t("otpComingSoon")}</Muted>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
