import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { Button, Chip, Empty, ErrorText, ListItem, StatusBadge, styles } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { dateIST, rupees } from "@/lib/format";
import { useI18n, type StringKey } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors, OPEN_STATUSES } from "@/lib/theme";
import type { RequestStatus, ServiceRequest } from "@/lib/types";
import { must, useLoad } from "@/lib/use-load";

type Filter = "all" | "action" | "open" | "completed" | "closed";
const FILTERS: { key: Filter; label: StringKey; match: (s: RequestStatus) => boolean }[] = [
  { key: "all", label: "all", match: () => true },
  { key: "action", label: "actionNeeded", match: (s) => s === "documents_required" },
  { key: "open", label: "open", match: (s) => OPEN_STATUSES.includes(s) },
  { key: "completed", label: "completed", match: (s) => s === "completed" },
  { key: "closed", label: "closed", match: (s) => s === "rejected" || s === "cancelled" },
];

export default function Requests() {
  const { t, pick } = useI18n();
  const { retailer } = useAuth();
  const params = useLocalSearchParams<{ filter?: Filter }>();
  const [filter, setFilter] = useState<Filter>(params.filter ?? "all");
  const [search, setSearch] = useState("");
  // Follow a new ?filter= link (from the home banner) without an effect.
  const [lastParam, setLastParam] = useState(params.filter);
  if (params.filter !== lastParam) {
    setLastParam(params.filter);
    if (params.filter) setFilter(params.filter);
  }

  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const res = await supabase
      .from("service_requests")
      .select(
        "id, request_number, status, customer_price, retailer_commission, submitted_at, updated_at, customers(full_name, mobile), services(name_en, name_mr)",
      )
      .order("updated_at", { ascending: false })
      .limit(500);
    return must(res) as unknown as ServiceRequest[];
  });

  useEffect(() => {
    if (!retailer) return;
    const channel = supabase
      .channel("requests-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests", filter: `retailer_id=eq.${retailer.id}` }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [retailer, reload]);

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (r) =>
        f.match(r.status) &&
        (!q ||
          r.request_number.toLowerCase().includes(q) ||
          (r.customers?.full_name ?? "").toLowerCase().includes(q) ||
          (r.customers?.mobile ?? "").includes(q)),
    );
  }, [data, filter, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 12, paddingBottom: 4 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("searchRequests")}
          placeholderTextColor={colors.muted}
          style={[styles.input, { marginBottom: 10 }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={t(f.label)} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>
        <ErrorText>{error}</ErrorText>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={data ? <Empty text={data.length ? t("nothingHere") : t("noRequestsYet")} /> : null}
        renderItem={({ item: r }) => (
          <ListItem
            title={`${r.customers?.full_name ?? ""} · ${pick(r.services?.name_mr, r.services?.name_en)}`}
            subtitle={`${r.request_number} · ${dateIST(r.submitted_at)} · ${rupees(r.customer_price)}`}
            right={<StatusBadge status={r.status} />}
            onPress={() => router.push(`/request/${r.id}`)}
          />
        )}
      />
      <View style={{ padding: 12 }}>
        <Button title={`+  ${t("newRequest")}`} variant="yellow" onPress={() => router.push("/new-request")} />
      </View>
    </View>
  );
}
