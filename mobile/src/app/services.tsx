import { useMemo, useState } from "react";
import { RefreshControl, TextInput, View } from "react-native";
import { ServiceCard } from "@/components/service-card";
import { Empty, ErrorText, H2, Screen, styles } from "@/components/ui";
import { loadCatalogue } from "@/lib/catalogue";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";
import { useLoad } from "@/lib/use-load";

export default function Services() {
  const { t, pick } = useI18n();
  const { data, error, refreshing, refresh } = useLoad(loadCatalogue);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.categories
      .map((c) => ({
        category: c,
        services: data.services.filter(
          (s) =>
            s.category_id === c.id &&
            (!q || s.name_en.toLowerCase().includes(q) || s.name_mr.includes(q) || s.code.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.services.length);
  }, [data, search]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("searchServices")}
        placeholderTextColor={colors.muted}
        style={[styles.input, { marginBottom: 12 }]}
      />
      <ErrorText>{error}</ErrorText>
      {data && groups.length === 0 ? <Empty text={t("nothingHere")} /> : null}
      {groups.map((g) => (
        <View key={g.category.id}>
          <H2>{pick(g.category.name_mr, g.category.name_en)}</H2>
          {g.services.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              docs={data!.docs.filter((d) => d.service_id === s.id)}
              expanded={open === s.id}
              onPress={() => setOpen(open === s.id ? null : s.id)}
            />
          ))}
        </View>
      ))}
    </Screen>
  );
}
