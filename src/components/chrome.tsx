import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, hairline, radii } from "@/theme";

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function Panel({
  label,
  accessory,
  children,
  style,
  onHeaderPress,
  headerAccessibilityLabel,
}: {
  label?: string;
  accessory?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onHeaderPress?: () => void;
  headerAccessibilityLabel?: string;
}) {
  const head =
    label || accessory ? (
      <View style={styles.panelHead}>
        {label ? <Text style={styles.fieldLabel}>{label}</Text> : <View />}
        {accessory}
      </View>
    ) : null;

  return (
    <View style={[styles.panel, style]}>
      {head && onHeaderPress ? (
        <Pressable
          onPress={onHeaderPress}
          accessibilityRole="button"
          accessibilityLabel={headerAccessibilityLabel ?? label}
          hitSlop={8}>
          {head}
        </Pressable>
      ) : (
        head
      )}
      {children}
    </View>
  );
}

export function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: string;
}) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: tone }]} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export function SettingsGlyph({ color = colors.text }: { color?: string }) {
  return (
    <View style={styles.glyph} accessibilityElementsHidden>
      <View style={[styles.glyphCell, { backgroundColor: color }]} />
      <View style={[styles.glyphCell, { backgroundColor: color }]} />
      <View style={[styles.glyphCell, { backgroundColor: color }]} />
      <View style={[styles.glyphCell, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: hairline,
    borderRadius: radii.md,
    padding: 12,
    gap: 8,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 28,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: hairline,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  chipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  glyph: {
    width: 14,
    height: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  glyphCell: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
});
