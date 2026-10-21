import { Text, TextInput, View } from "react-native";
import { Chip, styles } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";
import { DONT_KNOW, type ProfileField } from "@/lib/yojana";

/**
 * One profile question: big tap targets (chips) for choices, a number box
 * for numbers. Every question offers "Don't know", which the engine treats
 * as unknown, never as no. `undefined` means not asked yet.
 */
export function AnswerInput({
  field,
  value,
  onChange,
  title,
}: {
  field: ProfileField;
  value: unknown;
  onChange: (v: unknown) => void;
  title?: string;
}) {
  const { t, pick } = useI18n();
  const dk = value === DONT_KNOW;
  const toggle = (v: unknown) => onChange(value === v ? undefined : v);

  let body: React.ReactNode;
  if (field.kind === "yes_no") {
    body = (
      <>
        <Chip label={t("yes")} active={value === true} onPress={() => toggle(true)} />
        <Chip label={t("no")} active={value === false} onPress={() => toggle(false)} />
      </>
    );
  } else if (field.kind === "choice" || field.kind === "band") {
    body = field.options.map((o) => (
      <Chip key={o.value} label={pick(o.mr, o.en)} active={value === o.value} onPress={() => toggle(o.value)} />
    ));
  } else if (field.kind === "multi") {
    const picked = Array.isArray(value) ? (value as string[]) : [];
    body = (
      <>
        {field.options.map((o) => (
          <Chip
            key={o.value}
            label={pick(o.mr, o.en)}
            active={picked.includes(o.value)}
            onPress={() => onChange(picked.includes(o.value) ? picked.filter((p) => p !== o.value) : [...picked, o.value])}
          />
        ))}
        <Chip label={t("none")} active={Array.isArray(value) && picked.length === 0} onPress={() => onChange(Array.isArray(value) && !picked.length ? undefined : [])} />
      </>
    );
  } else {
    body = (
      <TextInput
        value={dk || value === undefined || value === null ? "" : String(value)}
        editable={!dk}
        onChangeText={(v) => {
          const clean = field.kind === "number" ? v.replace(/[^\d.]/g, "") : v;
          onChange(clean === "" ? undefined : field.kind === "number" ? Number(clean) : clean);
        }}
        keyboardType={field.kind === "number" ? "number-pad" : "default"}
        placeholder={field.kind === "date" ? "YYYY-MM-DD" : undefined}
        placeholderTextColor={colors.muted}
        style={[styles.input, { minWidth: 120 }]}
      />
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{title ?? pick(field.label_mr, field.label_en)}</Text>
      {field.help_mr || field.help_en ? <Text style={[styles.muted, { marginBottom: 6 }]}>{pick(field.help_mr, field.help_en)}</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {body}
        <Chip label={t("dontKnow")} active={dk} onPress={() => toggle(DONT_KNOW)} />
      </View>
    </View>
  );
}
