import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { dateIST, rupees } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { colors, tile } from "@/lib/theme";
import type { ServiceRequest } from "@/lib/types";
import { StatusBadge } from "./ui";

/** A request as a row: customer initial, name, service and date, status on the right. */
export function RequestRow({ r, showPrice, divider }: { r: ServiceRequest; showPrice?: boolean; divider?: boolean }) {
  const { pick } = useI18n();
  return (
    <Pressable
      onPress={() => router.push(`/request/${r.id}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        backgroundColor: pressed ? colors.blueLight : "transparent",
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: colors.border,
      })}
    >
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: tile, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
        <Text style={{ fontWeight: "800", color: colors.blue, fontSize: 16 }}>{(r.customers?.full_name ?? "?").slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }} numberOfLines={1}>
          {r.customers?.full_name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
          {pick(r.services?.name_mr, r.services?.name_en)}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
          {r.request_number} · {dateIST(r.submitted_at)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <StatusBadge status={r.status} />
        {showPrice ? <Text style={{ fontWeight: "800", color: colors.text }}>{rupees(r.customer_price)}</Text> : null}
      </View>
    </Pressable>
  );
}
