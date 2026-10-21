import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { AnswerInput } from "@/components/answer-input";
import { Button, Card, Chip, ErrorText, H2, Loading, Muted, Pill, Screen, styles } from "@/components/ui";
import { notify } from "@/lib/documents";
import { dateIST, rupees } from "@/lib/format";
import { useI18n, type StringKey } from "@/lib/i18n";
import { errorText, supabase } from "@/lib/supabase";
import { colors, shadow } from "@/lib/theme";
import { useLoad } from "@/lib/use-load";
import {
  RELATIONS,
  loadFamily,
  saveAndScreen,
  serviceFor,
  type Answers,
  type Member,
  type ProfileField,
  type Result,
  type ScreenResult,
} from "@/lib/yojana";

export default function YojanaFamily() {
  const { t, pick } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, refreshing, refresh, reload } = useLoad(() => loadFamily(id), id);
  const [showNo, setShowNo] = useState(false);

  if (!data) return error ? <ErrorText>{error}</ErrorText> : <Loading />;
  const { family, members, fields, screening, results, followups } = data;
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const labels = (keys: string[]) => keys.map((k) => (byKey.get(k) ? pick(byKey.get(k)!.label_mr, byKey.get(k)!.label_en) : k)).join(", ");
  const sorted = (r: ScreenResult) =>
    results.filter((x) => x.result === r).sort((a, b) => Number(b.schemes?.benefit_yearly ?? 0) - Number(a.schemes?.benefit_yearly ?? 0));
  const eligible = sorted("eligible");
  const check = sorted("check");
  const no = sorted("not_eligible");

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ErrorText>{error}</ErrorText>
      <Card>
        <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{family.family_name}</Text>
        <Muted>{[family.mobile, family.village].filter(Boolean).join(" · ")}</Muted>
        <People familyId={family.id} members={members} onChange={reload} />
      </Card>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Button title={t("answerQuestions")} variant="secondary" onPress={() => router.push({ pathname: "/yojana/answers", params: { id } })} />
        </View>
        {screening ? (
          <View style={{ flex: 1 }}>
            <Button title={t("moreQuestions")} variant="secondary" onPress={() => router.push({ pathname: "/yojana/answers", params: { id, block: "4" } })} />
          </View>
        ) : null}
      </View>

      {!screening ? (
        <Card>
          <Muted>{t("notChecked")}</Muted>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <Count n={eligible.length} label={t("eligible")} fg={colors.green} bg={colors.greenLight} />
            <Count n={check.length} label={t("checkOneMore")} fg="#8A6100" bg={colors.yellowLight} />
            <Count n={no.length} label={t("notEligible")} fg={colors.grey} bg={colors.greyLight} />
          </View>

          {followups.length ? (
            <AskNext
              key={screening.id}
              familyId={family.id}
              household={family.answers ?? {}}
              members={members}
              fields={byKey}
              followups={followups.slice(0, 3)}
              onDone={reload}
            />
          ) : null}

          {eligible.length ? <H2>{t("eligible")}</H2> : null}
          {eligible.map((r) => (
            <SchemeCard key={r.id} r={r} kind="eligible" members={members} family={family} reason={`${t("because")}: ${labels(r.passed_fields) || "—"}`} />
          ))}
          {check.length ? <H2>{t("checkOneMore")}</H2> : null}
          {check.map((r) => (
            <SchemeCard key={r.id} r={r} kind="check" members={members} family={family} reason={`${t("stillToAsk")}: ${labels(r.missing_fields) || "—"}`} />
          ))}

          {no.length ? (
            <Pressable onPress={() => setShowNo(!showNo)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 8 }}>
              <Ionicons name={showNo ? "chevron-down" : "chevron-forward"} size={18} color={colors.muted} />
              <Text style={{ color: colors.muted, fontWeight: "700" }}>
                {t("notEligible")} ({no.length})
              </Text>
            </Pressable>
          ) : null}
          {showNo
            ? no.map((r) => (
                <Card key={r.id} style={{ paddingVertical: 10 }}>
                  <Text style={{ fontWeight: "700", color: colors.text }}>{pick(r.schemes?.name_mr, r.schemes?.name_en)}</Text>
                  <Muted>
                    {r.member_id ? `${members.find((m) => m.id === r.member_id)?.full_name} · ` : ""}
                    {t("ruledOutBy")}: {labels(r.failed_fields) || "—"}
                  </Muted>
                </Card>
              ))
            : null}
          <Muted style={{ textAlign: "center", marginTop: 8 }}>
            {t("lastChecked")}: {dateIST(screening.run_at, true)}
          </Muted>
        </>
      )}
    </Screen>
  );
}

function Count({ n, label, fg, bg }: { n: number; label: string; fg: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: 16, padding: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "800", color: fg }}>{n}</Text>
      <Text style={{ fontSize: 12, color: fg, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function People({ familyId, members, onChange }: { familyId: string; members: Member[]; onChange: () => void }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<string>("spouse");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return setError(t("required"));
    setBusy(true);
    const { error: e } = await supabase
      .from("family_members")
      .insert({ family_id: familyId, full_name: name.trim(), relation, sort_order: members.length + 1 });
    setBusy(false);
    if (e) return setError(errorText(e));
    setName("");
    setAdding(false);
    setError(null);
    onChange();
  }

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{t("people")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {members.map((m) => (
          <Pill key={m.id} label={`${m.full_name} · ${t(`rel_${m.relation}` as StringKey)}`} fg={colors.blue} bg={colors.blueLight} />
        ))}
        {!adding ? (
          <Pressable onPress={() => setAdding(true)}>
            <Text style={{ color: colors.blue, fontWeight: "700", paddingVertical: 4 }}>+ {t("addPerson")}</Text>
          </Pressable>
        ) : null}
      </View>
      {adding ? (
        <View style={{ marginTop: 10 }}>
          <ErrorText>{error}</ErrorText>
          <TextInput value={name} onChangeText={setName} placeholder={t("fullName")} placeholderTextColor={colors.muted} style={[styles.input, { marginBottom: 8 }]} />
          <Text style={styles.label}>{t("relation")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {RELATIONS.filter((r) => r !== "self").map((r) => (
              <Chip key={r} label={t(`rel_${r}` as StringKey)} active={relation === r} onPress={() => setRelation(r)} />
            ))}
          </View>
          <Button title={t("addPerson")} onPress={add} loading={busy} small />
          <Button title={t("cancel")} variant="ghost" onPress={() => setAdding(false)} small />
        </View>
      ) : null}
    </View>
  );
}

// The top follow-up questions, answerable right here; answering re-screens.
function AskNext({
  familyId,
  household,
  members,
  fields,
  followups,
  onDone,
}: {
  familyId: string;
  household: Answers;
  members: Member[];
  fields: Map<string, ProfileField>;
  followups: { field: string; member_id: string | null; schemes: number }[];
  onDone: () => void;
}) {
  const { t, pick } = useI18n();
  const [house, setHouse] = useState<Answers>(household);
  const [people, setPeople] = useState<Record<string, Answers>>(Object.fromEntries(members.map((m) => [m.id, m.answers ?? {}])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveAndScreen(familyId, house, people);
      onDone();
    } catch (e) {
      setError(errorText(e));
    }
    setBusy(false);
  }

  return (
    <Card style={{ borderWidth: 2, borderColor: colors.yellow }}>
      <H2>{t("askNext")}</H2>
      <ErrorText>{error}</ErrorText>
      {followups.map((q) => {
        const f = fields.get(q.field);
        if (!f) return null;
        const who = q.member_id ? members.find((m) => m.id === q.member_id)?.full_name : t("wholeFamily");
        const title = `${pick(f.label_mr, f.label_en)} · ${who} (${t("settlesSchemes").replace("{n}", String(q.schemes))})`;
        return q.member_id ? (
          <AnswerInput
            key={`${q.field}:${q.member_id}`}
            field={f}
            title={title}
            value={people[q.member_id]?.[f.key]}
            onChange={(v) =>
              setPeople((p) => {
                const a = { ...(p[q.member_id!] ?? {}) };
                if (v === undefined) delete a[f.key];
                else a[f.key] = v;
                return { ...p, [q.member_id!]: a };
              })
            }
          />
        ) : (
          <AnswerInput
            key={q.field}
            field={f}
            title={title}
            value={house[f.key]}
            onChange={(v) =>
              setHouse((h) => {
                const a = { ...h };
                if (v === undefined) delete a[f.key];
                else a[f.key] = v;
                return a;
              })
            }
          />
        );
      })}
      <Button title={busy ? t("checking") : t("checkSchemes")} variant="yellow" onPress={save} loading={busy} />
    </Card>
  );
}

function SchemeCard({
  r,
  kind,
  members,
  family,
  reason,
}: {
  r: Result;
  kind: "eligible" | "check";
  members: Member[];
  family: { mobile: string | null; village: string | null };
  reason: string;
}) {
  const { t, pick } = useI18n();
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState<string | null>(r.member_id ?? (members.length === 1 ? members[0].id : null));
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = r.schemes;
  if (!s) return null;
  const service = serviceFor(r);
  const member = members.find((m) => m.id === r.member_id);

  async function apply() {
    const m = members.find((x) => x.id === who);
    if (!m || !service || !s) return setError(t("whoIsApplying"));
    setBusy(true);
    setError(null);
    let customerId = m.customer_id;
    if (!customerId) {
      const { data, error: e } = await supabase
        .from("customers")
        .insert({ full_name: m.full_name, mobile: family.mobile, village: family.village })
        .select("id")
        .single();
      if (e || !data) {
        setBusy(false);
        return setError(errorText(e));
      }
      customerId = data.id as string;
      await supabase.from("family_members").update({ customer_id: customerId }).eq("id", m.id);
    }
    setBusy(false);
    router.push({ pathname: "/new-request", params: { service: service.id, customer: customerId, scheme: s.id, member: m.id } });
  }

  async function sendReport() {
    if (!report?.trim() || !s) return;
    setBusy(true);
    const { error: e } = await supabase.from("scheme_suggestions").insert({ scheme_id: s.id, message: report.trim() });
    setBusy(false);
    if (e) return setError(errorText(e));
    setReport(null);
    notify(t("reportSent"));
  }

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 5,
        borderLeftColor: kind === "eligible" ? colors.green : colors.yellow,
        ...shadow,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: colors.text }}>{pick(s.name_mr, s.name_en)}</Text>
        {member ? <Pill label={member.full_name} fg={colors.blue} bg={colors.blueLight} /> : null}
      </View>
      {s.benefit_en || s.benefit_mr ? (
        <Text style={{ color: colors.green, fontWeight: "700", marginTop: 6 }}>{pick(s.benefit_mr, s.benefit_en)}</Text>
      ) : null}
      <Muted style={{ marginTop: 4 }}>{reason}</Muted>
      {r.manual_notes.length ? (
        <Text style={{ color: colors.orange, marginTop: 4 }}>
          {t("checkByHand")}: {r.manual_notes.join("; ")}
        </Text>
      ) : null}

      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 }}>
        <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={16} color={colors.blue} />
        <Text style={{ color: colors.blue, fontWeight: "700" }}>
          {t("documents")} ({s.scheme_documents.length})
        </Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 6 }}>
          {[...s.scheme_documents]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((d, i) => (
              <Text key={i} style={{ color: colors.text, marginBottom: 2 }}>
                • {pick(d.name_mr, d.name_en)}
                {!d.is_mandatory ? ` (${t("optional")})` : ""}
              </Text>
            ))}
          {s.apply_url ? (
            <Pressable onPress={() => Linking.openURL(s.apply_url!)}>
              <Text style={{ color: colors.blue, textDecorationLine: "underline", marginTop: 6 }}>{t("officialSite")}</Text>
            </Pressable>
          ) : null}
          {report === null ? (
            <Pressable onPress={() => setReport("")}>
              <Text style={{ color: colors.muted, marginTop: 8 }}>{t("reportProblem")}</Text>
            </Pressable>
          ) : (
            <View style={{ marginTop: 8 }}>
              <TextInput
                value={report}
                onChangeText={setReport}
                placeholder={t("reportHint")}
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.input, { minHeight: 70, textAlignVertical: "top", marginBottom: 6 }]}
              />
              <Button title={t("send")} onPress={sendReport} loading={busy} small variant="secondary" />
            </View>
          )}
        </View>
      ) : null}

      <ErrorText>{error}</ErrorText>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 12 }}>
        {service ? (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{rupees(service.customer_price)}</Text>
                <Muted>
                  {t("govtFee")} {rupees(service.govt_fee)} + {t("serviceCharge")} {rupees(service.service_charge)}
                </Muted>
                <Muted>
                  {t("yourCommission")} {rupees(service.retailer_commission)}
                </Muted>
              </View>
            </View>
            {!r.member_id && members.length > 1 ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>{t("whoIsApplying")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {members.map((m) => (
                    <Chip key={m.id} label={m.full_name} active={who === m.id} onPress={() => setWho(m.id)} />
                  ))}
                </View>
              </View>
            ) : null}
            <View style={{ marginTop: 10 }}>
              <Button title={t("apply")} variant={kind === "eligible" ? "yellow" : "secondary"} onPress={apply} loading={busy} disabled={!who} />
            </View>
          </>
        ) : (
          <Muted>{t("noPaidService")}</Muted>
        )}
      </View>
    </View>
  );
}
