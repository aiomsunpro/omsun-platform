import { router } from "expo-router";
import { RefreshControl, Text, View } from "react-native";
import { Card, Empty, ErrorText, H2, ListItem, Muted, Pill, Row, Screen } from "@/components/ui";
import { dateIST, rupees } from "@/lib/format";
import { useI18n, type StringKey } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import type { Commission, Settlement } from "@/lib/types";
import { must, useLoad } from "@/lib/use-load";

const COMMISSION_STYLE: Record<Commission["status"], { label: StringKey; fg: string; bg: string }> = {
  on_hold: { label: "onHold", fg: "#8A6100", bg: colors.yellowLight },
  earned: { label: "earned", fg: colors.green, bg: colors.greenLight },
  settled: { label: "settled", fg: colors.blue, bg: colors.blueLight },
  cancelled: { label: "closed", fg: colors.grey, bg: colors.greyLight },
};

export default function Earnings() {
  const { t } = useI18n();

  const { data, error, refreshing, refresh } = useLoad(async () => {
    const [commissions, settlements, dues] = await Promise.all([
      supabase
        .from("commissions")
        .select("id, request_id, amount, status, earned_at, created_at, service_requests(request_number, customers(full_name))")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("retailer_settlements")
        .select("id, period_start, period_end, request_count, gross_amount, commission_amount, amount_due, amount_received, balance, status")
        .order("period_start", { ascending: false })
        .limit(24),
      supabase.from("service_requests").select("amount_due, amount_paid").eq("status", "completed").neq("payment_status", "paid"),
    ]);
    const list = must(commissions) as unknown as Commission[];
    const sum = (s: Commission["status"]) => list.filter((c) => c.status === s).reduce((a, c) => a + Number(c.amount), 0);
    return {
      list,
      settlements: must(settlements) as Settlement[],
      onHold: sum("on_hold"),
      earned: sum("earned"),
      settled: sum("settled"),
      due: (must(dues) as { amount_due: number; amount_paid: number }[]).reduce(
        (a, r) => a + Math.max(0, Number(r.amount_due) - Number(r.amount_paid)),
        0,
      ),
    };
  });

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <ErrorText>{error}</ErrorText>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Total label={t("earned")} hint={t("earnedHint")} value={data?.earned} fg={colors.green} />
        <Total label={t("onHold")} hint={t("onHoldHint")} value={data?.onHold} fg="#8A6100" />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Total label={t("settled")} value={data?.settled} fg={colors.blue} />
        <Total label={t("dueToOmsun")} hint={t("dueToOmsunHint")} value={data?.due} fg={colors.orange} />
      </View>

      {data?.settlements.length ? (
        <>
          <H2>{t("monthlySettlements")}</H2>
          {data.settlements.map((s) => (
            <Card key={s.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontWeight: "700" }}>
                  {dateIST(s.period_start)} – {dateIST(s.period_end)}
                </Text>
                <Pill
                  label={t(s.status === "finalized" ? "finalized" : "draft")}
                  fg={s.status === "finalized" ? colors.green : colors.grey}
                  bg={s.status === "finalized" ? colors.greenLight : colors.greyLight}
                />
              </View>
              <Row label={t("requests")} value={String(s.request_count)} />
              <Row label={t("customerPrice")} value={rupees(s.gross_amount)} />
              <Row label={t("yourCommission")} value={rupees(s.commission_amount)} />
              <Row label={t("payToOmsun")} value={rupees(s.amount_due)} />
              <Row label={t("received")} value={rupees(s.amount_received)} />
              <Row label={t("balance")} value={rupees(s.balance)} strong />
            </Card>
          ))}
        </>
      ) : null}

      <H2>{t("commissionHistory")}</H2>
      <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
        {data && data.list.length === 0 ? <Empty text={t("noCommissions")} /> : null}
        {data?.list.map((c) => {
          const st = COMMISSION_STYLE[c.status];
          return (
            <ListItem
              key={c.id}
              title={`${rupees(c.amount)} · ${c.service_requests?.customers?.full_name ?? ""}`}
              subtitle={`${c.service_requests?.request_number ?? ""} · ${dateIST(c.earned_at ?? c.created_at)}`}
              right={<Pill label={t(st.label)} fg={st.fg} bg={st.bg} />}
              onPress={() => router.push(`/request/${c.request_id}`)}
            />
          );
        })}
      </View>
    </Screen>
  );
}

function Total({ label, hint, value, fg }: { label: string; hint?: string; value?: number; fg: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: fg }}>{value === undefined ? "–" : rupees(value)}</Text>
      <Text style={{ fontWeight: "700", marginTop: 2 }}>{label}</Text>
      {hint ? <Muted style={{ fontSize: 12, marginTop: 2 }}>{hint}</Muted> : null}
    </Card>
  );
}
