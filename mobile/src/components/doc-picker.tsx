import { Pressable, Text, View } from "react-native";
import { pickFile, type PickedFile, type PickSource } from "@/lib/documents";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";

/** One document slot: its name, the files added so far, and Camera / Gallery / File buttons. */
export function DocSlot({
  title,
  mandatory,
  files,
  onAdd,
  onRemove,
}: {
  title: string;
  /** true: highlighted until a file is added; false: marked optional; unset: neither. */
  mandatory?: boolean;
  files: PickedFile[];
  onAdd: (f: PickedFile) => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useI18n();

  async function add(source: PickSource) {
    const f = await pickFile(source);
    if (f) onAdd(f);
  }

  const done = files.length > 0;
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: done ? colors.green : mandatory === true ? colors.orange : colors.border,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontWeight: "700", flex: 1 }}>
          {done ? "✓ " : ""}
          {title}
        </Text>
        {mandatory === false ? <Text style={{ color: colors.muted, fontSize: 12 }}>{t("optional")}</Text> : null}
      </View>
      {files.map((f, i) => (
        <View key={`${f.uri}-${i}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Text style={{ flex: 1, color: colors.text }} numberOfLines={1}>
            📄 {f.name}
          </Text>
          <Pressable onPress={() => onRemove(i)} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: colors.red }}>{t("remove")}</Text>
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <SourceButton label={t("camera")} onPress={() => add("camera")} />
        <SourceButton label={t("gallery")} onPress={() => add("gallery")} />
        <SourceButton label={t("file")} onPress={() => add("file")} />
      </View>
    </View>
  );
}

function SourceButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        borderWidth: 1,
        borderColor: colors.blue,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: "center",
        backgroundColor: pressed ? colors.blueLight : colors.white,
      })}
    >
      <Text style={{ color: colors.blue, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
