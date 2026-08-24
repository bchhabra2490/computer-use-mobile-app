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
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, hairline, radii, stateColor } from "@/theme";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const DOUBLE_TAP_SCALE = 2.5;

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
        {zoom && uri ? (
          <ZoomableMacFrame
            key={uri}
            uri={uri}
            topInset={insets.top}
            bottomInset={insets.bottom}
            onClose={() => setZoom(false)}
          />
        ) : null}
      </Modal>
    </>
  );
}

function clamp(value: number, min: number, max: number): number {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

function ZoomableMacFrame({
  uri,
  topInset,
  bottomInset,
  onClose,
}: {
  uri: string;
  topInset: number;
  bottomInset: number;
  onClose: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const boxW = useSharedValue(1);
  const boxH = useSharedValue(1);

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) {
        reset();
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((event) => {
      if (scale.value <= 1) return;
      tx.value = savedTx.value + event.translationX;
      ty.value = savedTy.value + event.translationY;
    })
    .onEnd(() => {
      const maxX = Math.max(0, (boxW.value * (scale.value - 1)) / 2);
      const maxY = Math.max(0, (boxH.value * (scale.value - 1)) / 2);
      const nextX = clamp(tx.value, -maxX, maxX);
      const nextY = clamp(ty.value, -maxY, maxY);
      tx.value = withTiming(nextX);
      ty.value = withTiming(nextY);
      savedTx.value = nextX;
      savedTy.value = nextY;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_event, success) => {
      if (!success) return;
      if (scale.value > 1.05) {
        reset();
        return;
      }
      scale.value = withTiming(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureHandlerRootView
      style={[styles.zoomRoot, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.zoomHeader}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close Mac screen"
          style={styles.closeHit}>
          <Text style={styles.closeText}>CLOSE</Text>
        </Pressable>
      </View>
      <GestureDetector gesture={composed}>
        <Animated.View
          collapsable={false}
          style={[styles.zoomStage, animatedStyle]}
          onLayout={(event) => {
            boxW.value = event.nativeEvent.layout.width;
            boxH.value = event.nativeEvent.layout.height;
          }}>
          <Image
            source={{ uri }}
            style={styles.zoomImage}
            contentFit="contain"
            cachePolicy="none"
          />
        </Animated.View>
      </GestureDetector>
      <Text style={styles.zoomHint}>PINCH OR DOUBLE-TAP TO ZOOM</Text>
    </GestureHandlerRootView>
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
  },
  zoomHeader: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  zoomStage: {
    flex: 1,
    width: "100%",
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
