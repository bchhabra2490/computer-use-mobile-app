import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, hairline, radii } from "@/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = {
  label: string;
  caption?: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: Variant;
  flex?: boolean;
};

const variantStyles: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.accentFill, fg: colors.accentOnFill, border: colors.accentFill },
  secondary: { bg: colors.elevated, fg: colors.text, border: colors.border },
  danger: { bg: colors.errorFill, fg: colors.error, border: colors.errorBorder },
  ghost: { bg: "transparent", fg: colors.muted, border: "transparent" },
};

export function AppButton({
  label,
  caption,
  icon,
  onPress,
  disabled = false,
  busy = false,
  variant = "secondary",
  flex = false,
}: Props) {
  const palette = variantStyles[variant];
  const dimmed = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={caption ? `${label}. ${caption}` : label}
      accessibilityState={{ disabled: dimmed }}
      onPress={onPress}
      disabled={dimmed}
      android_ripple={{ color: "rgba(255,255,255,0.08)" }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        flex ? styles.flex : null,
        dimmed ? styles.dimmed : null,
        pressed && !dimmed ? styles.pressed : null,
      ]}>
      {busy ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.labels}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
          {caption ? (
            <Text style={[styles.caption, { color: palette.fg }]}>{caption}</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: hairline,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  dimmed: {
    opacity: 0.38,
  },
  pressed: {
    opacity: 0.88,
  },
  labels: {
    alignItems: "center",
    gap: 2,
  },
  icon: {
    marginBottom: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 10,
    letterSpacing: 0.3,
    opacity: 0.72,
  },
});
