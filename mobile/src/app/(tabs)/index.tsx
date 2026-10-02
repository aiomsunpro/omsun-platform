import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TAB_BAR_SPACE } from "@/components/floating-tab-bar";
import { RequestRow } from "@/components/request-row";
import { ErrorText } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { monthStartIST, rupees } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors, OPEN_STATUSES, shadow, tile } from "@/lib/theme";
import type { Announcement, ServiceRequest } from "@/lib/types";
import { must, useLoad } from "@/lib/use-load";

type IconName = keyof typeof Ionicons.glyphMap;

export default function Home() {
  const { t, pick } = useI18n();
  const { profile, retailer } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [slide, setSlide] = useState(0);
  const [card, setCard] = useState(0);

  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const monthStart = monthStartIST();
    const [requests, recent, earned, dues, announcements, unread] = await Promise.all([
      supabase.from("service_requests").select("status, submitted_at").order("submitted_at", { ascending: false }).limit(1000),
      supabase
        .from("service_requests")
        .select("id, request_number, status, submitted_at, customers(full_name), services(name_en, name_mr)")
        .order("updated_at", { ascending: false })
        .limit(4),
      supabase.from("commissions").select("amount").in("status", ["earned", "settled"]).gte("earned_at", monthStart),
      supabase.from("service_requests").select("amount_due, amount_paid").eq("status", "completed").neq("payment_status", "paid"),
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
      due: ((dues.data ?? []) as { amount_due: number; amount_paid: number }[]).reduce(
        (a, r) => a + Math.max(0, Number(r.amount_due) - Number(r.amount_paid)),
        0,
      ),
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

  const slides = [
    { title: t("heroTitle"), body: t("heroSubtitle") },
    ...(data?.announcements ?? []).map((a) => ({ title: pick(a.title_mr, a.title_en), body: pick(a.body_mr, a.body_en) })),
  ];
  const cardWidth = width - 56;
  const onPage = (setter: (n: number) => void, size: number) => (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setter(Math.round(e.nativeEvent.contentOffset.x / size));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.white} />}
    >
      {/* Hero: greeting, bell and a swipeable banner */}
      <View
        style={{
          backgroundColor: colors.blue,
          paddingTop: insets.top + 12,
          paddingBottom: 72,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
            <Image source={require("../../../assets/omsun-emblem.png")} style={{ width: 30, height: 30 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.white, fontSize: 16, fontWeight: "800" }} numberOfLines={1}>
              {t("hello")}, {profile?.full_name?.split(" ")[0] ?? ""}
            </Text>
            <Text style={{ color: colors.blueLight, fontSize: 12 }} numberOfLines={1}>
              {retailer?.business_name}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityLabel={t("notifications")}
            style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={data?.unread ? "notifications" : "notifications-outline"} size={22} color={colors.white} />
            {data?.unread ? (
              <View style={{ position: "absolute", right: 4, top: 2, backgroundColor: colors.yellow, borderRadius: 9, minWidth: 18, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", textAlign: "center", color: colors.text }}>{data.unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onPage(setSlide, width)} style={{ marginTop: 20 }}>
          {slides.map((s, i) => (
            <View key={i} style={{ width, paddingHorizontal: 24 }}>
              <Text style={{ color: colors.white, fontSize: 24, fontWeight: "800", lineHeight: 32, textAlign: "center" }}>{s.title}</Text>
              {s.body ? <Text style={{ color: colors.blueLight, fontSize: 13, marginTop: 6, textAlign: "center" }}>{s.body}</Text> : null}
            </View>
          ))}
        </ScrollView>
        <Dots count={slides.length} active={slide} light />
      </View>

      {/* Money cards, overlapping the hero like a bank card */}
      <ScrollView
        horizontal
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPage(setCard, cardWidth + 12)}
        style={{ marginTop: -56 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        <MoneyCard
          width={cardWidth}
          label={t("earnedThisMonth")}
          amount={data?.earnedThisMonth}
          sub={`${t("mitraId")} · ${retailer?.mobile ?? ""}`}
          badge="OMSUN"
          footer={t("earningsHistory")}
          onPress={() => router.push("/earnings")}
        />
        <MoneyCard
          width={cardWidth}
          label={t("dueToOmsun")}
          amount={data?.due}
          sub={t("dueToOmsunHint")}
          badge={t("balance")}
          footer={t("monthlySettlements")}
          onPress={() => router.push("/earnings")}
          dark
        />
      </ScrollView>
      <Dots count={2} active={card} />

      <ErrorText>{error}</ErrorText>

      {/* Tile grid: a big yellow tile plus small icon tiles, like the reference design */}
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => router.push("/new-request")}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: pressed ? "#E0A800" : colors.yellow,
              borderRadius: 24,
              padding: 16,
              justifyContent: "space-between",
              minHeight: 150,
            })}
          >
            <Ionicons name="sparkles" size={34} color={colors.text} />
            <View>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{t("newRequest")}</Text>
              <Text style={{ fontSize: 12, color: "#5C4600", marginTop: 2 }}>
                {data ? `${data.monthCount} ${t("thisMonth").toLowerCase()}` : " "}
              </Text>
            </View>
          </Pressable>

          <View style={{ flex: 1.25, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <IconTile icon="pricetags-outline" label={t("tileServices")} onPress={() => router.push("/services")} />
              <IconTile icon="people-outline" label={t("tileCustomers")} onPress={() => router.push("/customers")} />
              <IconTile icon="notifications-outline" label={t("tileAlerts")} onPress={() => router.push("/notifications")} badge={data?.unread} />
            </View>
            <Pressable
              onPress={() => router.push("/services")}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: pressed ? colors.blueLight : tile,
                borderRadius: 999,
                paddingHorizontal: 16,
                minHeight: 52,
              })}
            >
              <Text style={{ fontWeight: "700", color: colors.text }}>{t("seeMore")}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.blue} />
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <PillTile
            icon="alert-circle-outline"
            label={t("tileDocs")}
            count={data?.actionCount}
            highlight={!!data?.actionCount}
            onPress={() => router.push({ pathname: "/requests", params: { filter: "action" } })}
          />
          <PillTile
            icon="time-outline"
            label={t("tileTrack")}
            count={data?.openCount}
            onPress={() => router.push({ pathname: "/requests", params: { filter: "open" } })}
          />
        </View>

        {/* Recent requests */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>{t("recentRequests")}</Text>
          <Pressable onPress={() => router.push("/requests")}>
            <Text style={{ color: colors.blue, fontWeight: "700" }}>{t("viewAll")}</Text>
          </Pressable>
        </View>
        <View style={{ backgroundColor: colors.white, borderRadius: 24, overflow: "hidden", ...shadow }}>
          {data && data.recent.length === 0 ? (
            <Text style={{ color: colors.muted, textAlign: "center", padding: 24 }}>{t("noRequestsYet")}</Text>
          ) : null}
          {data?.recent.map((r, i) => (
            <RequestRow key={r.id} r={r} divider={i > 0} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function Dots({ count, active, light }: { count: number; active: number; light?: boolean }) {
  if (count < 2) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 18 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: light ? (i === active ? colors.white : "rgba(255,255,255,0.4)") : i === active ? colors.blue : colors.border,
          }}
        />
      ))}
    </View>
  );
}

function MoneyCard({
  width,
  label,
  amount,
  sub,
  badge,
  footer,
  onPress,
  dark,
}: {
  width: number;
  label: string;
  amount?: number;
  sub: string;
  badge: string;
  footer: string;
  onPress: () => void;
  dark?: boolean;
}) {
  const bg = dark ? colors.blueDark : "#5163C9";
  return (
    <Pressable onPress={onPress} style={{ width, borderRadius: 24, backgroundColor: bg, overflow: "hidden", ...shadow }}>
      <View style={{ padding: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.blueLight, fontSize: 13, fontWeight: "600" }}>{label}</Text>
          <Text style={{ color: colors.white, fontSize: 11, fontWeight: "800", letterSpacing: 0.5 }}>{badge}</Text>
        </View>
        <Text style={{ color: colors.white, fontSize: 32, fontWeight: "800", marginTop: 6 }}>
          {amount === undefined ? "₹ –" : rupees(amount)}
        </Text>
        <Text style={{ color: colors.blueLight, fontSize: 12, marginTop: 4 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(255,255,255,0.14)",
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: colors.white, fontWeight: "700" }}>{footer}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.yellow} />
      </View>
    </Pressable>
  );
}

function IconTile({ icon, label, onPress, badge }: { icon: IconName; label: string; onPress: () => void; badge?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1,
        borderRadius: 20,
        backgroundColor: pressed ? colors.blueLight : tile,
        alignItems: "center",
        justifyContent: "center",
        padding: 4,
      })}
    >
      <Ionicons name={icon} size={24} color={colors.blue} />
      <Text style={{ fontSize: 10, color: colors.text, marginTop: 4, textAlign: "center", fontWeight: "600" }} numberOfLines={2}>
        {label}
      </Text>
      {badge ? (
        <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: colors.yellow, borderRadius: 8, minWidth: 16, paddingHorizontal: 3 }}>
          <Text style={{ fontSize: 10, fontWeight: "800", textAlign: "center" }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function PillTile({
  icon,
  label,
  count,
  highlight,
  onPress,
}: {
  icon: IconName;
  label: string;
  count?: number;
  highlight?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: highlight ? colors.orangeLight : pressed ? colors.blueLight : tile,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 14,
      })}
    >
      <Ionicons name={icon} size={20} color={highlight ? colors.orange : colors.blue} />
      <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: highlight ? colors.orange : colors.text }} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <View style={{ backgroundColor: highlight ? colors.orange : colors.blue, borderRadius: 999, minWidth: 24, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ color: colors.white, fontWeight: "800", textAlign: "center", fontSize: 12 }}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
