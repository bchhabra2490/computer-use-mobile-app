import { useEffect } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
  type ImagePickerOptions,
} from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { PHOTO_MAX_BYTES } from "@/api/client";
import { colors } from "@/theme";

const PICKER: ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.7,
  allowsEditing: false,
  exif: false,
};

type Props = {
  disabled?: boolean;
  busy?: boolean;
  attached?: boolean;
  requestCapture?: number;
  onPicked: (uri: string) => void;
};

export function SendPhotoButton({
  disabled = false,
  busy = false,
  attached = false,
  requestCapture,
  onPicked,
}: Props) {
  const blocked = disabled || busy;

  const takeAsset = async (uri: string | null | undefined, fileSize?: number) => {
    if (!uri) {
      Alert.alert("Photo", "Couldn't read that still.");
      return;
    }
    if (fileSize && fileSize > PHOTO_MAX_BYTES) {
      Alert.alert("Photo", "That still is over 6MB. Try again closer or with less light.");
      return;
    }
    onPicked(uri);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // optional
    }
  };

  const takePhoto = async (fromWidget = false) => {
    if (busy) return;
    if (!fromWidget && disabled) return;
    if (Platform.OS === "web") {
      Alert.alert("Photo", "Take a still on the iOS or Android app.");
      return;
    }
    const perm = await requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera", "Jarvis Remote takes a photo to send to your Mac.");
      return;
    }
    const result = await launchCameraAsync(PICKER);
    if (result.canceled) return;
    const asset = result.assets[0];
    await takeAsset(asset?.uri, asset?.fileSize);
  };

  const pickLibrary = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Photo", "Pick a still on the iOS or Android app.");
      return;
    }
    const perm = await requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Jarvis Remote can send a photo from your library to your Mac.");
      return;
    }
    const result = await launchImageLibraryAsync(PICKER);
    if (result.canceled) return;
    const asset = result.assets[0];
    await takeAsset(asset?.uri, asset?.fileSize);
  };

  useEffect(() => {
    if (!requestCapture) return;
    void takePhoto(true);
    // takePhoto is recreated each render; kick only when the widget asks again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestCapture]);

  const onPress = () => {
    if (blocked) return;
    void takePhoto();
  };

  const onLongPress = () => {
    if (blocked) return;
    void pickLibrary();
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Attach a camera still. Long press to pick from the library."
        disabled={blocked}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={380}
        style={({ pressed }) => [
          styles.cam,
          attached ? styles.live : null,
          pressed && !blocked ? styles.pressed : null,
          blocked ? styles.dimmed : null,
        ]}>
        <Text style={styles.camText}>CAM</Text>
      </Pressable>
      <Text style={styles.caption}>{attached ? "HELD" : "ATTACH"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 4,
    minWidth: 52,
  },
  cam: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  live: {
    borderColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.9,
  },
  dimmed: {
    opacity: 0.38,
  },
  camText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.text,
  },
  caption: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.6,
    textAlign: "center",
  },
});
