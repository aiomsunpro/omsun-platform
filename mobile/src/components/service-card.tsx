import { Pressable, Text, View } from "react-native";
import { rupees } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";
import type { RequiredDocument, Service } from "@/lib/types";
import { Card, Muted, Row } from "./ui";

/** One service with its price split; expands to show the document checklist. */
export function ServiceCard({
  service,
  docs,
  expanded,
  selected,
  onPress,
}: {
  service: Service;
  docs: RequiredDocument[];
  expanded?: boolean;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { t, pick } = useI18n();
  const description = pick(service.description_mr, service.description_en);
  const instructions = pick(service.instructions_mr, service.instructions_en);
  return (
    <Pressable onPress={onPress}>
      <Card style={selected ? { borderColor: colors.blue, borderWidth: 2, backgroundColor: colors.blueLight } : undefined}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={{ fontSize: 16, fontWeight: "700", flex: 1, paddingRight: 8 }}>{pick(service.name_mr, service.name_en)}</Text>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.blue }}>{rupees(service.customer_price)}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Muted>{service.code}</Muted>
          <Text style={{ color: colors.green, fontWeight: "700" }}>
            {t("yourCommission")}: {rupees(service.retailer_commission)}
          </Text>
        </View>
        {expanded ? (
          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
            {description ? <Text style={{ marginBottom: 8 }}>{description}</Text> : null}
            <Row label={t("govtFee")} value={rupees(service.govt_fee)} />
            <Row label={t("serviceCharge")} value={rupees(service.service_charge)} />
            <Row label={t("yourCommission")} value={rupees(service.retailer_commission)} />
            <Row label={t("payToOmsun")} value={rupees(service.customer_price - service.retailer_commission)} strong />
            {service.processing_days ? (
              <Row label={t("processingDays")} value={`${service.processing_days} ${t("days")}`} />
            ) : null}
            {docs.length ? (
              <>
                <Text style={{ fontWeight: "700", marginTop: 8, marginBottom: 4 }}>{t("requiredDocuments")}</Text>
                {docs.map((d) => (
                  <Text key={d.id} style={{ marginBottom: 2 }}>
                    • {pick(d.name_mr, d.name_en)}
                    {d.is_mandatory ? "" : ` (${t("optional")})`}
                  </Text>
                ))}
              </>
            ) : null}
            {instructions ? <Muted style={{ marginTop: 8 }}>{instructions}</Muted> : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
