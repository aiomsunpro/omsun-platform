import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DocSlot } from "@/components/doc-picker";
import { ServiceCard } from "@/components/service-card";
import { Button, Card, Empty, ErrorText, Field, H2, ListItem, Loading, Muted, Row, Screen, styles } from "@/components/ui";
import { loadCatalogue } from "@/lib/catalogue";
import { confirm, notify, uploadRequestDocument, type PickedFile } from "@/lib/documents";
import { cleanMobile, isMobile, rupees } from "@/lib/format";
import { useI18n, type StringKey } from "@/lib/i18n";
import { errorText, supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import type { Customer } from "@/lib/types";
import { must, useLoad } from "@/lib/use-load";

const STEPS: StringKey[] = ["customer", "service", "documents", "review"];
const OTHER = "other";

export default function NewRequest() {
  const insets = useSafeAreaInsets();
  const { t, pick } = useI18n();
  const params = useLocalSearchParams<{ service?: string }>();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(params.service ?? null);
  const [files, setFiles] = useState<Record<string, PickedFile[]>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const catalogue = useLoad(loadCatalogue);
  const customers = useLoad(async () => {
    const res = await supabase
      .from("customers")
      .select("id, full_name, mobile, village, taluka, district, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    return must(res) as Customer[];
  });

  const service = catalogue.data?.services.find((s) => s.id === serviceId) ?? null;
  const requiredDocs = useMemo(
    () => (catalogue.data?.docs ?? []).filter((d) => d.service_id === serviceId),
    [catalogue.data, serviceId],
  );
  const missing = requiredDocs.filter((d) => d.is_mandatory && !(files[d.id]?.length));
  const questions = useMemo(
    () => (catalogue.data?.questions ?? []).filter((q) => q.service_id === serviceId),
    [catalogue.data, serviceId],
  );
  const answered = questions.filter((q) => answers[q.id]?.trim());

  // Required questions must be answered before moving past the documents step.
  function next() {
    if (step === 2) {
      const e: Record<string, string> = {};
      for (const q of questions) if (q.is_mandatory && !answers[q.id]?.trim()) e[q.id] = t("required");
      setAnswerErrors(e);
      if (Object.keys(e).length) return;
    }
    setStep(step + 1);
  }

  const canNext = (step === 0 && !!customer) || (step === 1 && !!service) || step === 2;

  async function submit() {
    if (!customer || !service) return;
    if (missing.length) {
      const ok = await confirm(
        t("missingDocsTitle"),
        `${t("missingDocsBody")}\n\n${missing.map((d) => `• ${pick(d.name_mr, d.name_en)}`).join("\n")}`,
        t("submitAnyway"),
        t("back"),
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    setProgress(t("submitting"));
    const { data, error } = await supabase
      .from("service_requests")
      .insert({ customer_id: customer.id, service_id: service.id, remarks: remarks.trim() || null })
      .select("id, request_number")
      .single();
    if (error || !data) {
      setBusy(false);
      setProgress(null);
      return setError(errorText(error));
    }

    let detailsFailed = false;
    if (answered.length) {
      setProgress(t("submitting"));
      const { error: ansErr } = await supabase.from("request_answers").insert(
        answered.map((q) => ({
          request_id: data.id,
          question_id: q.id,
          question_en: q.question_en,
          question_mr: q.question_mr,
          answer: answers[q.id].trim(),
        })),
      );
      detailsFailed = !!ansErr;
    }

    // Upload documents after the request exists, since files are stored under its id.
    const all = Object.entries(files).flatMap(([slot, list]) => list.map((f) => ({ slot, f })));
    let failed = 0;
    for (let i = 0; i < all.length; i++) {
      const { slot, f } = all[i];
      setProgress(`${t("uploading")} ${i + 1}/${all.length}`);
      const reqDoc = requiredDocs.find((d) => d.id === slot);
      try {
        await uploadRequestDocument(data.id, f, reqDoc ? reqDoc.name_en : "Other Document", reqDoc?.id ?? null);
      } catch {
        failed++;
      }
    }
    setBusy(false);
    setProgress(null);
    const problems = [failed ? t("someUploadsFailed") : null, detailsFailed ? t("detailsNotSaved") : null].filter(Boolean);
    notify(`${t("requestSent")}: ${data.request_number}`, problems.length ? problems.join("\n\n") : undefined);
    router.replace(`/request/${data.id}`);
  }

  if (!catalogue.data || !customers.data) {
    return catalogue.error || customers.error ? <ErrorText>{catalogue.error ?? customers.error}</ErrorText> : <Loading />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StepBar step={step} />
      <Screen edges={[]}>
        <ErrorText>{error}</ErrorText>
        {step === 0 ? (
          <CustomerStep
            customers={customers.data}
            selected={customer}
            onSelect={(c) => {
              setCustomer(c);
              setStep(1);
            }}
            onCreated={(c) => {
              customers.reload();
              setCustomer(c);
              setStep(1);
            }}
          />
        ) : null}

        {step === 1 ? (
          <>
            <H2>{t("chooseService")}</H2>
            <ServiceList
              catalogue={catalogue.data}
              selectedId={serviceId}
              onSelect={(id) => {
                if (id !== serviceId) {
                  setFiles({});
                  setAnswers({});
                  setAnswerErrors({});
                }
                setServiceId(id);
              }}
            />
          </>
        ) : null}

        {step === 2 && service ? (
          <>
            {questions.length ? (
              <>
                <H2>{t("customerDetails")}</H2>
                <Muted style={{ marginBottom: 10 }}>{t("customerDetailsHint")}</Muted>
                {questions.map((q) => (
                  <Field
                    key={q.id}
                    label={`${pick(q.question_mr, q.question_en)}${q.is_mandatory ? " *" : ` (${t("optional")})`}`}
                    value={answers[q.id] ?? ""}
                    onChangeText={(v) => setAnswers((p) => ({ ...p, [q.id]: v }))}
                    error={answerErrors[q.id]}
                    maxLength={2000}
                  />
                ))}
              </>
            ) : null}
            <H2>{t("requiredDocuments")}</H2>
            {requiredDocs.map((d) => (
              <DocSlot
                key={d.id}
                title={pick(d.name_mr, d.name_en)}
                mandatory={d.is_mandatory}
                files={files[d.id] ?? []}
                onAdd={(f) => setFiles((p) => ({ ...p, [d.id]: [...(p[d.id] ?? []), f] }))}
                onRemove={(i) => setFiles((p) => ({ ...p, [d.id]: (p[d.id] ?? []).filter((_, j) => j !== i) }))}
              />
            ))}
            <DocSlot
              title={t("otherDocument")}
              mandatory={false}
              files={files[OTHER] ?? []}
              onAdd={(f) => setFiles((p) => ({ ...p, [OTHER]: [...(p[OTHER] ?? []), f] }))}
              onRemove={(i) => setFiles((p) => ({ ...p, [OTHER]: (p[OTHER] ?? []).filter((_, j) => j !== i) }))}
            />
          </>
        ) : null}

        {step === 3 && customer && service ? (
          <>
            <Card>
              <Row label={t("customer")} value={`${customer.full_name}${customer.mobile ? ` · ${customer.mobile}` : ""}`} />
              <Row label={t("service")} value={pick(service.name_mr, service.name_en)} />
              {answered.map((q) => (
                <Row key={q.id} label={pick(q.question_mr, q.question_en)} value={answers[q.id].trim()} />
              ))}
              <Row
                label={t("documents")}
                value={String(Object.values(files).reduce((n, l) => n + l.length, 0))}
              />
            </Card>
            <Card style={{ backgroundColor: colors.yellowLight, borderColor: colors.yellow }}>
              <Row label={t("collectFromCustomer")} value={rupees(service.customer_price)} strong />
              <Row label={t("yourCommission")} value={rupees(service.retailer_commission)} />
              <Row label={t("payToOmsun")} value={rupees(service.customer_price - service.retailer_commission)} strong />
            </Card>
            {missing.length ? (
              <Card style={{ backgroundColor: colors.orangeLight, borderColor: colors.orange }}>
                <Text style={{ color: colors.orange, fontWeight: "700" }}>{t("missingDocsTitle")}</Text>
                {missing.map((d) => (
                  <Text key={d.id} style={{ color: colors.orange }}>
                    • {pick(d.name_mr, d.name_en)}
                  </Text>
                ))}
              </Card>
            ) : null}
            <Field label={t("remarks")} value={remarks} onChangeText={setRemarks} placeholder={t("remarksHint")} multiline />
          </>
        ) : null}
      </Screen>

      <View style={{ flexDirection: "row", gap: 10, padding: 12, paddingBottom: 12 + insets.bottom, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }}>
        {step > 0 ? (
          <View style={{ flex: 1 }}>
            <Button title={t("back")} variant="secondary" onPress={() => setStep(step - 1)} disabled={busy} />
          </View>
        ) : null}
        <View style={{ flex: 2 }}>
          {step < 3 ? (
            step > 0 || customer ? <Button title={t("next")} onPress={next} disabled={!canNext} /> : null
          ) : (
            <Button title={progress ?? t("submitRequest")} variant="yellow" onPress={submit} loading={busy && !progress} disabled={busy} />
          )}
        </View>
      </View>
    </View>
  );
}

function StepBar({ step }: { step: number }) {
  const { t } = useI18n();
  return (
    <View style={{ flexDirection: "row", backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {STEPS.map((s, i) => (
        <View
          key={s}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            borderBottomWidth: 3,
            borderBottomColor: i === step ? colors.yellow : i < step ? colors.blue : "transparent",
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: i === step ? "800" : "600", color: i <= step ? colors.blue : colors.muted }}>
            {i + 1}. {t(s)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CustomerStep({
  customers,
  selected,
  onSelect,
  onCreated,
}: {
  customers: Customer[];
  selected: Customer | null;
  onSelect: (c: Customer) => void;
  onCreated: (c: Customer) => void;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(customers.length === 0);
  const [form, setForm] = useState({ full_name: "", mobile: "", village: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => !q || c.full_name.toLowerCase().includes(q) || (c.mobile ?? "").includes(q)).slice(0, 50);
  }, [customers, search]);

  async function save() {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = t("required");
    if (form.mobile.trim() && !isMobile(form.mobile)) e.mobile = t("invalidMobile");
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        full_name: form.full_name.trim(),
        mobile: form.mobile.trim() ? cleanMobile(form.mobile) : null,
        village: form.village.trim() || null,
      })
      .select("id, full_name, mobile, village, taluka, district, created_at")
      .single();
    setBusy(false);
    if (error || !data) return setError(errorText(error));
    onCreated(data as Customer);
  }

  if (adding) {
    return (
      <>
        <H2>{t("addNewCustomer")}</H2>
        <ErrorText>{error}</ErrorText>
        <Field label={t("fullName")} value={form.full_name} onChangeText={(v) => setForm({ ...form, full_name: v })} error={errors.full_name} />
        <Field
          label={t("mobile")}
          value={form.mobile}
          onChangeText={(v) => setForm({ ...form, mobile: v })}
          error={errors.mobile}
          keyboardType="phone-pad"
          maxLength={14}
        />
        <Field label={t("village")} value={form.village} onChangeText={(v) => setForm({ ...form, village: v })} />
        <Button title={t("saveCustomer")} onPress={save} loading={busy} />
        {customers.length ? <Button title={t("back")} variant="ghost" onPress={() => setAdding(false)} /> : null}
      </>
    );
  }

  return (
    <>
      <Button title={`+  ${t("addNewCustomer")}`} variant="secondary" onPress={() => setAdding(true)} />
      <H2>{t("chooseCustomer")}</H2>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("searchCustomers")}
        placeholderTextColor={colors.muted}
        style={[styles.input, { marginBottom: 10 }]}
      />
      <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
        {rows.length === 0 ? <Empty text={t("nothingHere")} /> : null}
        {rows.map((c) => (
          <ListItem
            key={c.id}
            title={`${selected?.id === c.id ? "✓ " : ""}${c.full_name}`}
            subtitle={[c.mobile, c.village].filter(Boolean).join(" · ")}
            onPress={() => onSelect(c)}
          />
        ))}
      </View>
    </>
  );
}

function ServiceList({
  catalogue,
  selectedId,
  onSelect,
}: {
  catalogue: Awaited<ReturnType<typeof loadCatalogue>>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t, pick } = useI18n();
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const services = catalogue.services.filter(
    (s) => !q || s.name_en.toLowerCase().includes(q) || s.name_mr.includes(q) || s.code.toLowerCase().includes(q),
  );
  return (
    <>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("searchServices")}
        placeholderTextColor={colors.muted}
        style={[styles.input, { marginBottom: 10 }]}
      />
      {services.length === 0 ? <Empty text={t("nothingHere")} /> : null}
      {catalogue.categories.map((c) => {
        const list = services.filter((s) => s.category_id === c.id);
        if (!list.length) return null;
        return (
          <View key={c.id}>
            <Muted style={{ fontWeight: "700", marginBottom: 6 }}>{pick(c.name_mr, c.name_en)}</Muted>
            {list.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                docs={catalogue.docs.filter((d) => d.service_id === s.id)}
                selected={selectedId === s.id}
                expanded={selectedId === s.id}
                onPress={() => onSelect(s.id)}
              />
            ))}
          </View>
        );
      })}
    </>
  );
}
