import { useMemo, useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { Empty, ErrorText, ListItem, styles } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import type { Customer } from "@/lib/types";
import { must, useLoad } from "@/lib/use-load";

export default function Customers() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data, error, refreshing, refresh } = useLoad(async () => {
    const res = await supabase
      .from("customers")
      .select("id, full_name, mobile, village, taluka, district, created_at")
      .order("full_name")
      .limit(1000);
    return must(res) as Customer[];
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((c) => !q || c.full_name.toLowerCase().includes(q) || (c.mobile ?? "").includes(q));
  }, [data, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: 12 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("searchCustomers")}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <ErrorText>{error}</ErrorText>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={data ? <Empty text={data.length ? t("nothingHere") : t("noCustomers")} /> : null}
        renderItem={({ item: c }) => (
          <ListItem
            title={c.full_name}
            subtitle={[c.mobile, c.village].filter(Boolean).join(" · ")}
            right={
              c.mobile ? (
                <Pressable onPress={() => Linking.openURL(`tel:${c.mobile}`)} style={{ padding: 8 }}>
                  <Text style={{ color: colors.blue, fontWeight: "700" }}>📞</Text>
                </Pressable>
              ) : null
            }
          />
        )}
      />
    </View>
  );
}
