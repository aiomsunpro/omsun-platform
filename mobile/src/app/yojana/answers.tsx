import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnswerInput } from "@/components/answer-input";
import { Button, Card, ErrorText, H2, Loading, Screen } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { errorText } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import { loadFamily, saveAndScreen, type Answers } from "@/lib/yojana";
import { useLoad } from "@/lib/use-load";

const BLOCK_EN = ["", "Basic Identity", "Social Category", "Family And Income", "Occupation", "Land And Housing", "Life Situation", "Education", "Existing Benefits", "Documents Held"];
const BLOCK_MR = ["", "मूलभूत माहिती", "सामाजिक प्रवर्ग", "कुटुंब व उत्पन्न", "व्यवसाय", "जमीन व घर", "जीवनस्थिती", "शिक्षण", "आधीचे लाभ", "असलेली कागदपत्रे"];

// One block of questions per page. Family questions once, then each person.
// "Check Schemes" is offered from block 3 on: the first three blocks already
// settle most schemes, later ones only matter for some.
export default function YojanaAnswers() {
  const { id, block } = useLocalSearchParams<{ id: string; block?: string }>();
  const { data, error } = useLoad(() => loadFamily(id), id);
  if (!data) return error ? <ErrorText>{error}</ErrorText> : <Loading />;
  // The form takes the saved answers when it first opens; a later reload does not overwrite typing.
  return <AnswersForm key={id} id={id} data={data} startBlock={Number(block ?? 1)} />;
}

function AnswersForm({ id, data, startBlock }: { id: string; data: Awaited<ReturnType<typeof loadFamily>>; startBlock: number }) {
  const { t, pick } = useI18n();
  const insets = useSafeAreaInsets();
  const blocks = [...new Set(data.fields.map((f) => f.block))].sort((a, b) => a - b);
  const [house, setHouse] = useState<Answers>(data.family.answers ?? {});
  const [people, setPeople] = useState<Record<string, Answers>>(
    Object.fromEntries(data.members.map((m) => [m.id, m.answers ?? {}])),
  );
  const [step, setStep] = useState(Math.max(0, blocks.indexOf(startBlock)));
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const b = blocks[step];
  const fields = data.fields.filter((f) => f.block === b);
  const hh = fields.filter((f) => f.scope === "household");
  const mm = fields.filter((f) => f.scope === "member");
  const last = step === blocks.length - 1;

  const set = (a: Answers, k: string, v: unknown) => {
    const n = { ...a };
    if (v === undefined) delete n[k];
    else n[k] = v;
    return n;
  };

  async function finish() {
    setBusy(true);
    setSaveError(null);
    try {
      await saveAndScreen(id, house, people);
      router.replace(`/yojana/${id}`);
    } catch (e) {
      setSaveError(errorText(e));
    }
    setBusy(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", gap: 4, padding: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {blocks.map((x, i) => (
          <View key={x} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? colors.blue : colors.border }} />
        ))}
      </View>
      <Screen key={step} edges={[]}>
        <Text style={{ color: colors.muted, fontWeight: "700" }}>
          {t("blockOf").replace("{a}", String(step + 1)).replace("{b}", String(blocks.length))}
        </Text>
        <H2>{pick(BLOCK_MR[b], BLOCK_EN[b]) || `${b}`}</H2>
        <ErrorText>{saveError}</ErrorText>
        {hh.length ? (
          <Card>
            <Text style={{ fontWeight: "800", color: colors.blue, marginBottom: 10 }}>{t("wholeFamily")}</Text>
            {hh.map((f) => (
              <AnswerInput key={f.key} field={f} value={house[f.key]} onChange={(v) => setHouse((h) => set(h, f.key, v))} />
            ))}
          </Card>
        ) : null}
        {mm.length
          ? data.members.map((m) => (
              <Card key={m.id}>
                <Text style={{ fontWeight: "800", color: colors.blue, marginBottom: 10 }}>{m.full_name}</Text>
                {mm.map((f) => (
                  <AnswerInput
                    key={f.key}
                    field={f}
                    value={people[m.id]?.[f.key]}
                    onChange={(v) => setPeople((p) => ({ ...p, [m.id]: set(p[m.id] ?? {}, f.key, v) }))}
                  />
                ))}
              </Card>
            ))
          : null}
      </Screen>
      <View style={{ flexDirection: "row", gap: 10, padding: 12, paddingBottom: 12 + insets.bottom, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }}>
        {step > 0 ? (
          <View style={{ flex: 1 }}>
            <Button title={t("back")} variant="secondary" onPress={() => setStep(step - 1)} disabled={busy} />
          </View>
        ) : null}
        {!last ? (
          <View style={{ flex: 2 }}>
            <Button title={t("next")} onPress={() => setStep(step + 1)} disabled={busy} />
          </View>
        ) : null}
        {step >= 2 || last ? (
          <View style={{ flex: 2 }}>
            <Button title={busy ? t("checking") : t("checkSchemes")} variant="yellow" onPress={finish} loading={busy} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
