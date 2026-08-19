import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, hairline, radii, stateColor } from "@/theme";

const PLACEHOLDER = "Starts when a computer-use task captures a frame.";

type Props = {
  uri: string | null;
  width: number | null;
  height: number | null;
  state: string;
  detail: string;
  loading: boolean;
};

export function MacScreenPreview({ uri, width, height, state, detail, loading }: Props) {
  const [zoom, setZoom] = useState(false);
  const insets = useSafeAreaInsets();
  const ratio = useMemo(() => {
    if (width && height && width > 0 && height > 0) {
      return width / height;
    }
    return 16 / 10;
  }, [width, height]);

  const sizeMeta =
    width && height ? `${width}×${height}` : "—";

  const overlay = (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.overlayBar}>
        <View style={styles.badge}>
          <View style={[styles.badgeDot, { backgroundColor: stateColor(state) }]} />
          <Text style={styles.badgeText}>{state}</Text>
        </View>
        <Text style={styles.sizeMeta}>{sizeMeta}</Text>
      </View>
      {detail ? (
        <Text style={styles.overlayDetail} numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </View>
  );

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Mac screen preview"
        onPress={() => {
          if (uri) setZoom(true);
        }}
        style={[styles.frame, { aspectRatio: ratio }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="contain"
            cachePolicy="none"
            transition={80}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderKicker}>NO FRAME</Text>
            <Text style={styles.placeholderText}>{PLACEHOLDER}</Text>
          </View>
        )}
        {loading ? (
          <View style={styles.spinner}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : null}
        {overlay}
      </Pressable>

      <Modal
        visible={zoom}
        animationType="fade"
        transparent
        onRequestClose={() => setZoom(false)}>
        <Pressable
          style={[styles.zoomRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          onPress={() => setZoom(false)}
          accessibilityRole="button"
          accessibilityLabel="Close Mac screen">
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.zoomImage}
              contentFit="contain"
              cachePolicy="none"
            />
          ) : null}
          <Text style={styles.zoomHint}>TAP TO CLOSE</Text>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    backgroundColor: "#07080A",
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: hairline,
    borderColor: colors.borderStrong,
  },
  image: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  placeholder: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: colors.surface,
    gap: 6,
  },
  placeholderKicker: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    fontFamily: fonts.mono,
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  spinner: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,12,15,0.4)",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    padding: 10,
    backgroundColor: "rgba(11,12,15,0.72)",
    gap: 6,
  },
  overlayBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: fonts.mono,
  },
  sizeMeta: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fonts.mono,
  },
  overlayDetail: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  zoomRoot: {
    flex: 1,
    backgroundColor: "rgba(7,8,10,0.96)",
    justifyContent: "center",
  },
  zoomImage: {
    width: "100%",
    flex: 1,
  },
  zoomHint: {
    color: colors.faint,
    textAlign: "center",
    paddingVertical: 12,
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "600",
  },
});
