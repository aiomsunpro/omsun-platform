import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { Button, Card, Empty, ErrorText, H2, ListItem, Muted, Screen, StatusBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { dateIST, monthStartIST, rupees } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors, OPEN_STATUSES } from "@/lib/theme";
import type { Announcement, ServiceRequest } from "@/lib/types";
import { must, useLoad } from "@/lib/use-load";

export default function Home() {
  const { t, pick } = useI18n();
  const { profile, retailer } = useAuth();
  const navigation = useNavigation();

  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const monthStart = monthStartIST();
    const [requests, recent, earned, announcements, unread] = await Promise.all([
      supabase.from("service_requests").select("status, submitted_at").order("submitted_at", { ascending: false }).limit(1000),
      supabase
        .from("service_requests")
        .select("id, request_number, status, submitted_at, customers(full_name), services(name_en, name_mr)")
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase.from("commissions").select("amount").in("status", ["earned", "settled"]).gte("earned_at", monthStart),
      supabase.from("announcements").select("id, title_en, title_mr, body_en, body_mr, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
    ]);
    const rows = must(requests) as Pick<ServiceRequest, "status" | "submitted_at">[];
    return {
      monthCount: rows.filter((r) => r.submitted_at >= monthStart).length,
      openCount: rows.filter((r) => OPEN_STATUSES.includes(r.status)).length,
      actionCount: rows.filter((r) => r.status === "documents_required").length,
      recent: must(recent) as unknown as ServiceRequest[],
      earnedThisMonth: (must(earned) as { amount: number }[]).reduce((s, c) => s + Number(c.amount), 0),
      announcements: (announcements.data ?? []) as Announcement[],
      unread: unread.count ?? 0,
    };
  });

  // Live updates when OMSUN changes a request.
  useEffect(() => {
    if (!retailer) return;
    const channel = supabase
      .channel("home-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `retailer_id=eq.${retailer.id}` }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [retailer, reload]);

  const unread = data?.unread ?? 0;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push("/notifications")} style={{ paddingHorizontal: 16 }} accessibilityLabel={t("notifications")}>
          <Ionicons name={unread ? "notifications" : "notifications-outline"} size={24} color={colors.white} />
          {unread ? (
            <View style={{ position: "absolute", right: 10, top: -4, backgroundColor: colors.yellow, borderRadius: 9, minWidth: 18, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", textAlign: "center", color: colors.text }}>{unread}</Text>
            </View>
          ) : null}
        </Pressable>
      ),
    });
  }, [navigation, unread, t]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>
        {t("hello")}, {profile?.full_name?.split(" ")[0] ?? ""}
      </Text>
      <Muted style={{ marginBottom: 16 }}>{retailer?.business_name}</Muted>
      <ErrorText>{error}</ErrorText>

      {data && data.actionCount > 0 ? (
        <Pressable onPress={() => router.push({ pathname: "/requests", params: { filter: "action" } })}>
          <Card style={{ backgroundColor: colors.orangeLight, borderColor: colors.orange }}>
            <Text style={{ color: colors.orange, fontWeight: "700" }}>
              {t("docsNeededBanner")}: {data.actionCount} →
            </Text>
          </Card>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <Stat label={t("thisMonth")} value={data ? String(data.monthCount) : "–"} />
        <Stat label={t("openRequests")} value={data ? String(data.openCount) : "–"} />
        <Stat label={t("earnedThisMonth")} value={data ? rupees(data.earnedThisMonth) : "–"} accent />
      </View>

      <Button title={`+  ${t("newRequest")}`} variant="yellow" onPress={() => router.push("/new-request")} />
      <Button title={t("servicesAndPrices")} variant="secondary" onPress={() => router.push("/services")} />

      {data?.announcements.length ? (
        <View style={{ marginTop: 8 }}>
          <H2>{t("announcements")}</H2>
          {data.announcements.map((a) => (
            <Card key={a.id} style={{ backgroundColor: colors.yellowLight, borderColor: colors.yellow }}>
              <Text style={{ fontWeight: "700", marginBottom: 4 }}>{pick(a.title_mr, a.title_en)}</Text>
              {pick(a.body_mr, a.body_en) ? <Text>{pick(a.body_mr, a.body_en)}</Text> : null}
            </Card>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <H2>{t("recentRequests")}</H2>
        <Pressable onPress={() => router.push("/requests")}>
          <Text style={{ color: colors.blue, fontWeight: "600" }}>{t("viewAll")}</Text>
        </Pressable>
      </View>
      <View style={{ borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
        {data && data.recent.length === 0 ? <Empty text={t("noRequestsYet")} /> : null}
        {data?.recent.map((r) => (
          <ListItem
            key={r.id}
            title={`${r.customers?.full_name ?? ""} · ${pick(r.services?.name_mr, r.services?.name_en)}`}
            subtitle={`${r.request_number} · ${dateIST(r.submitted_at)}`}
            right={<StatusBadge status={r.status} />}
            onPress={() => router.push(`/request/${r.id}`)}
          />
        ))}
      </View>
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent ? colors.blue : colors.white,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: accent ? colors.blue : colors.border,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "800", color: accent ? colors.white : colors.blue }}>{value}</Text>
      <Text style={{ fontSize: 12, color: accent ? colors.blueLight : colors.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
