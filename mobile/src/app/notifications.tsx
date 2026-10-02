import { router } from "expo-router";
import { FlatList, RefreshControl, View } from "react-native";
import { Button, Empty, ErrorText, ListItem } from "@/components/ui";
import { dateIST } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import type { Notification, RequestStatus } from "@/lib/types";
import { must, useLoad } from "@/lib/use-load";

export default function Notifications() {
  const { t, statusLabel } = useI18n();
  const { data, error, refreshing, refresh, reload } = useLoad(async () => {
    const res = await supabase
      .from("notifications")
      .select("id, type, title, body, request_id, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return must(res) as Notification[];
  });

  // The database writes status titles as "OMS-2610-000123: completed"; show the status in the app's language.
  function title(n: Notification) {
    const m = n.type === "request_status" ? n.title.match(/^(.*): (\w+)$/) : null;
    return m ? `${m[1]}: ${statusLabel(m[2] as RequestStatus) ?? m[2]}` : n.title;
  }

  async function open(n: Notification) {
    if (!n.is_read) await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    if (n.request_id) router.push(`/request/${n.request_id}`);
    else reload();
  }

  async function markAll() {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    reload();
  }

  const unread = (data ?? []).some((n) => !n.is_read);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ErrorText>{error}</ErrorText>
      <FlatList
        data={data ?? []}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={data ? <Empty text={t("noNotifications")} /> : null}
        renderItem={({ item: n }) => (
          <ListItem
            title={`${n.is_read ? "" : "● "}${title(n)}`}
            subtitle={[n.body, dateIST(n.created_at, true)].filter(Boolean).join(" · ")}
            onPress={() => open(n)}
          />
        )}
      />
      {unread ? (
        <View style={{ padding: 12 }}>
          <Button title={t("markAllRead")} variant="secondary" onPress={markAll} />
        </View>
      ) : null}
    </View>
  );
}
