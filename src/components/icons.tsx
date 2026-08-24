import { type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

type IconProps = {
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

function Box({
  size,
  style,
  children,
}: {
  size: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View
      style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}
      accessibilityElementsHidden>
      {children}
    </View>
  );
}

export function MicIcon({ color = "#E6E8EC", size = 22, style }: IconProps) {
  const stroke = Math.max(2, Math.round(size * 0.09));
  return (
    <Box size={size} style={style}>
      <View
        style={{
          width: size * 0.34,
          height: size * 0.48,
          borderRadius: size * 0.17,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.56,
          height: size * 0.26,
          marginTop: -stroke,
          borderWidth: stroke,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: size * 0.3,
          borderBottomRightRadius: size * 0.3,
        }}
      />
      <View style={{ width: stroke, height: size * 0.12, backgroundColor: color, marginTop: 1 }} />
      <View style={{ width: size * 0.36, height: stroke, backgroundColor: color, borderRadius: 1 }} />
    </Box>
  );
}

export function CameraIcon({ color = "#E6E8EC", size = 22, style }: IconProps) {
  const stroke = Math.max(2, Math.round(size * 0.09));
  return (
    <Box size={size} style={style}>
      <View
        style={{
          width: size * 0.72,
          height: size * 0.52,
          borderRadius: size * 0.1,
          borderWidth: stroke,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
          marginTop: size * 0.1,
        }}>
        <View
          style={{
            width: size * 0.24,
            height: size * 0.24,
            borderRadius: size * 0.12,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          top: size * 0.02,
          right: size * 0.16,
          width: size * 0.22,
          height: size * 0.14,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          backgroundColor: color,
        }}
      />
    </Box>
  );
}

/** Paper-plane send affordance (points up-right). */
export function SendIcon({ color = "#12141A", size = 22, style }: IconProps) {
  const tip = size * 0.42;
  const body = Math.max(2, size * 0.11);
  return (
    <Box size={size} style={[{ transform: [{ rotate: "45deg" }] }, style]}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: tip * 0.55,
          borderRightWidth: tip * 0.55,
          borderBottomWidth: tip,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
        }}
      />
      <View
        style={{
          width: body,
          height: size * 0.38,
          marginTop: -size * 0.06,
          backgroundColor: color,
          borderBottomLeftRadius: 1,
          borderBottomRightRadius: 1,
        }}
      />
    </Box>
  );
}

export function PhoneSpeakerIcon({ color = "#E6E8EC", size = 18, style }: IconProps) {
  const stroke = Math.max(1.5, Math.round(size * 0.1));
  return (
    <Box size={size} style={style}>
      <View
        style={{
          width: size * 0.4,
          height: size * 0.7,
          borderRadius: size * 0.08,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: size * 0.06,
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          borderWidth: stroke,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          width: size * 0.28,
          height: size * 0.28,
          borderRadius: size * 0.14,
          borderWidth: stroke,
          borderColor: color,
          opacity: 0.5,
        }}
      />
    </Box>
  );
}

/** Default points down; pass `up` to point up. */
export function ChevronIcon({
  color = "#8D939C",
  size = 14,
  up = false,
  style,
}: IconProps & { up?: boolean }) {
  return (
    <Box size={size} style={[style, { transform: [{ rotate: up ? "180deg" : "0deg" }] }]}>
      <View
        style={{
          width: size * 0.48,
          height: size * 0.48,
          borderRightWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: "45deg" }],
          marginTop: -size * 0.18,
        }}
      />
    </Box>
  );
}
