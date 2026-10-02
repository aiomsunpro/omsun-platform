import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { DocSlot } from "@/components/doc-picker";
import { Button, Card, Empty, ErrorText, Field, H2, Loading, Muted, Pill, Row, Screen, StatusBadge } from "@/components/ui";
import { confirm, notify, openDocument, uploadRequestDocument, type PickedFile } from "@/lib/documents";
import { dateIST, rupees } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { errorText, supabase } from "@/lib/supabase";
import { colors, FINAL_STATUSES } from "@/lib/theme";
import type { RequestDocument, RequiredDocument, ServiceRequest, StatusHistory } from "@/lib/types";
import { must, useLoad } from "@/lib/use-load";

const OTHER = "other";

export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, pick, statusLabel } = useI18n();
  const navigation = useNavigation();
  const [picked, setPicked] = useState<Record<string, PickedFile[]>>({});
  const [uploading, setUploading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const req = must(
      await supabase
        .from("service_requests")
        .select("*, customers(full_name, mobile), services(name_en, name_mr)")
        .eq("id", id)
        .single(),
    ) as unknown as ServiceRequest;
    const [history, docs, required] = await Promise.all([
      supabase.from("request_status_history").select("id, from_status, to_status, note, created_at").eq("request_id", id).order("created_at"),
      supabase
        .from("request_documents")
        .select("id, kind, document_name, storage_path, mime_type, verification, verification_note, created_at")
        .eq("request_id", id)
        .order("created_at"),
      supabase.from("service_required_documents").select("*").eq("service_id", req.service_id).order("sort_order"),
    ]);
    return {
      req,
      history: must(history) as StatusHistory[],
      docs: must(docs) as RequestDocument[],
      required: must(required) as RequiredDocument[],
    };
  }, id);

  useLayoutEffect(() => {
    if (data) navigation.setOptions({ title: data.req.request_number });
  }, [navigation, data]);

  useEffect(() => {
    const channel = supabase
      .channel(`request-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "service_requests", filter: `id=eq.${id}` }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, reload]);

  if (!data) return error ? <ErrorText>{error}</ErrorText> : <Loading />;
  const { req, history, docs, required } = data;
  const isFinal = FINAL_STATUSES.includes(req.status);
  const inputs = docs.filter((d) => d.kind === "input");
  const outputs = docs.filter((d) => d.kind === "output");
  const pickedCount = Object.values(picked).reduce((n, l) => n + l.length, 0);
  const balance = Math.max(0, Number(req.amount_due) - Number(req.amount_paid));

  async function open(d: RequestDocument) {
    try {
      await openDocument(d.storage_path);
    } catch (e) {
      notify(t("error"), errorText(e));
    }
  }

  async function upload() {
    setUploading(true);
    setActionError(null);
    let failed = 0;
    for (const [slot, files] of Object.entries(picked)) {
      const reqDoc = required.find((r) => r.id === slot);
      for (const f of files) {
        try {
          await uploadRequestDocument(id, f, reqDoc ? reqDoc.name_en : t("otherDocument"), reqDoc?.id ?? null);
        } catch (e) {
          failed++;
          setActionError(errorText(e));
        }
      }
    }
    setUploading(false);
    if (!failed) setPicked({});
    reload();
  }

  async function cancelRequest() {
    if (!cancelNote.trim()) return setActionError(t("required"));
    const ok = await confirm(t("cancelRequest"), cancelNote.trim(), t("confirmCancel"), t("back"));
    if (!ok) return;
    setBusy(true);
    setActionError(null);
    const { error } = await supabase
      .from("service_requests")
      .update({ status: "cancelled", last_status_note: cancelNote.trim() })
      .eq("id", id);
    setBusy(false);
    if (error) return setActionError(errorText(error));
    setShowCancel(false);
    reload();
  }

  const add = (slot: string) => (f: PickedFile) => setPicked((p) => ({ ...p, [slot]: [...(p[slot] ?? []), f] }));
  const remove = (slot: string) => (i: number) =>
    setPicked((p) => ({ ...p, [slot]: (p[slot] ?? []).filter((_, j) => j !== i) }));

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", flex: 1, paddingRight: 8 }}>
            {pick(req.services?.name_mr, req.services?.name_en)}
          </Text>
          <StatusBadge status={req.status} />
        </View>
        <Row label={t("customer")} value={`${req.customers?.full_name ?? ""}${req.customers?.mobile ? ` · ${req.customers.mobile}` : ""}`} />
        <Row label={t("submittedOn")} value={dateIST(req.submitted_at, true)} />
        {req.completed_at ? <Row label={t("completedOn")} value={dateIST(req.completed_at, true)} /> : null}
        {req.remarks ? <Row label={t("remarks")} value={req.remarks} /> : null}
      </Card>

      {req.status === "documents_required" ? (
        <Card style={{ backgroundColor: colors.orangeLight, borderColor: colors.orange }}>
          <Text style={{ color: colors.orange, fontWeight: "700", marginBottom: 4 }}>{t("messageFromOmsun")}</Text>
          <Text style={{ color: colors.text }}>{req.last_status_note}</Text>
          <Text style={{ color: colors.orange, marginTop: 8, fontWeight: "600" }}>↓ {t("uploadMissingDocs")}</Text>
        </Card>
      ) : req.status === "rejected" && req.last_status_note ? (
        <Card style={{ backgroundColor: colors.redLight, borderColor: colors.red }}>
          <Text style={{ color: colors.red, fontWeight: "700", marginBottom: 4 }}>{t("messageFromOmsun")}</Text>
          <Text>{req.last_status_note}</Text>
        </Card>
      ) : null}

      <ErrorText>{actionError}</ErrorText>

      {outputs.length ? (
        <>
          <H2>{t("finishedDocuments")}</H2>
          {outputs.map((d) => (
            <DocRow key={d.id} doc={d} onOpen={() => open(d)} />
          ))}
        </>
      ) : null}

      <Card>
        <Row label={t("customerPrice")} value={rupees(req.customer_price)} />
        <Row label={t("yourCommission")} value={rupees(req.retailer_commission)} />
        <Row label={t("payToOmsun")} value={rupees(req.amount_due)} />
        <Row label={t("paidToOmsun")} value={rupees(req.amount_paid)} />
        <Row label={t("balanceToOmsun")} value={rupees(balance)} strong />
      </Card>

      <H2>{t("yourDocuments")}</H2>
      {inputs.length === 0 ? <Muted style={{ marginBottom: 12 }}>{t("noDocuments")}</Muted> : null}
      {inputs.map((d) => (
        <DocRow key={d.id} doc={d} onOpen={() => open(d)} />
      ))}

      {!isFinal ? (
        <View style={{ marginTop: 8 }}>
          <H2>{req.status === "documents_required" ? t("uploadMissingDocs") : t("addMoreDocuments")}</H2>
          {required.map((r) => (
            <DocSlot
              key={r.id}
              title={pick(r.name_mr, r.name_en)}
              files={picked[r.id] ?? []}
              onAdd={add(r.id)}
              onRemove={remove(r.id)}
            />
          ))}
          <DocSlot title={t("otherDocument")} files={picked[OTHER] ?? []} onAdd={add(OTHER)} onRemove={remove(OTHER)} />
          {pickedCount ? (
            <Button title={`${t("uploadNow")} (${pickedCount})`} onPress={upload} loading={uploading} />
          ) : null}
        </View>
      ) : null}

      <H2>{t("timeline")}</H2>
      <Card>
        {history.length === 0 ? <Empty text={t("nothingHere")} /> : null}
        {history.map((h, i) => (
          <View key={h.id} style={{ flexDirection: "row", marginBottom: i === history.length - 1 ? 0 : 12 }}>
            <View style={{ alignItems: "center", marginRight: 10 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: i === history.length - 1 ? colors.yellow : colors.blue, marginTop: 4 }} />
              {i < history.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: 2 }} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{statusLabel(h.to_status)}</Text>
              <Muted>{dateIST(h.created_at, true)}</Muted>
              {h.note ? <Text style={{ marginTop: 2 }}>{h.note}</Text> : null}
            </View>
          </View>
        ))}
      </Card>

      {req.status === "new" ? (
        showCancel ? (
          <Card>
            <Field label={t("cancelReason")} value={cancelNote} onChangeText={setCancelNote} multiline />
            <Button title={t("confirmCancel")} variant="danger" onPress={cancelRequest} loading={busy} />
            <Button title={t("back")} variant="ghost" onPress={() => setShowCancel(false)} />
          </Card>
        ) : (
          <Button title={t("cancelRequest")} variant="danger" onPress={() => setShowCancel(true)} />
        )
      ) : null}
    </Screen>
  );
}

function DocRow({ doc, onOpen }: { doc: RequestDocument; onOpen: () => void }) {
  const { t } = useI18n();
  const v =
    doc.verification === "verified"
      ? { label: t("verified"), fg: colors.green, bg: colors.greenLight }
      : doc.verification === "rejected"
        ? { label: t("rejectedDoc"), fg: colors.red, bg: colors.redLight }
        : { label: t("pendingCheck"), fg: colors.grey, bg: colors.greyLight };
  return (
    <Pressable onPress={onOpen}>
      <Card style={{ paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ flex: 1, fontWeight: "600" }} numberOfLines={2}>
            📄 {doc.document_name}
          </Text>
          {doc.kind === "input" ? <Pill {...v} /> : null}
          <Text style={{ color: colors.blue, fontWeight: "700", marginLeft: 10 }}>{t("openFile")}</Text>
        </View>
        {doc.verification === "rejected" && doc.verification_note ? (
          <Text style={{ color: colors.red, marginTop: 4 }}>{doc.verification_note}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
