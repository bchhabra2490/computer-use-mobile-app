import { useEffect } from "react";
import { Alert, Platform, Pressable, StyleSheet } from "react-native";
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
  type ImagePickerOptions,
} from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { PHOTO_MAX_BYTES } from "@/api/client";
import { CameraIcon } from "@/components/icons";
import { colors, hairline, radii } from "@/theme";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestCapture]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Attach a camera still. Long press to pick from the library."
      accessibilityState={{ selected: attached }}
      disabled={blocked}
      onPress={() => {
        if (blocked) return;
        void takePhoto();
      }}
      onLongPress={() => {
        if (blocked) return;
        void pickLibrary();
      }}
      delayLongPress={380}
      style={({ pressed }) => [
        styles.btn,
        attached ? styles.held : null,
        pressed && !blocked ? styles.pressed : null,
        blocked ? styles.dimmed : null,
      ]}>
      <CameraIcon color={colors.text} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.elevated,
    borderWidth: hairline,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  held: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.9,
  },
  dimmed: {
    opacity: 0.38,
  },
});
