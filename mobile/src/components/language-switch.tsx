import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { colors } from "@/lib/theme";
import type { Lang } from "@/lib/types";

/** मराठी | English toggle. Saves to the profile when logged in. */
export function LanguageSwitch() {
  const { lang } = useI18n();
  const { setLanguage } = useAuth();
  const options: { value: Lang; label: string }[] = [
    { value: "mr", label: "मराठी" },
    { value: "en", label: "English" },
  ];
  return (
    <View style={{ flexDirection: "row", borderRadius: 999, borderWidth: 1, borderColor: colors.blue, overflow: "hidden" }}>
      {options.map((o) => {
        const active = o.value === lang;
        return (
          <Pressable
            key={o.value}
            onPress={() => setLanguage(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: active ? colors.blue : colors.white }}
          >
            <Text style={{ color: active ? colors.white : colors.blue, fontWeight: "700" }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
