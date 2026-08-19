import Constants from "expo-constants";
import { Alert, Platform } from "react-native";

import { COMPOSE_WIDGET_NAME } from "@/state/compose-intent";
import { loadPairing } from "@/storage/pairing";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export async function syncComposeWidget(): Promise<void> {
  if (Platform.OS !== "android" || isExpoGo()) return;
  try {
    const { requestWidgetUpdate } =
      require("react-native-android-widget") as typeof import("react-native-android-widget");
    const { JarvisWidget } = require("@/widget/JarvisWidget") as typeof import("@/widget/JarvisWidget");
    const pairing = await loadPairing();
    await requestWidgetUpdate({
      widgetName: COMPOSE_WIDGET_NAME,
      renderWidget: () => <JarvisWidget paired={Boolean(pairing)} />,
    });
  } catch {
    // unlinked native module, or no widget pinned
  }
}

export async function pinComposeWidget(): Promise<void> {
  if (Platform.OS !== "android") {
    Alert.alert("Home widget", "The home-screen widget is Android-only for now.");
    return;
  }
  if (isExpoGo()) {
    Alert.alert(
      "Home widget",
      "Widgets need a native Android build. Expo Go cannot host them. From this project run npx expo run:android, then long-press the home screen and add Jarvis.",
    );
    return;
  }
  try {
    const { requestPinWidget } =
      require("react-native-android-widget") as typeof import("react-native-android-widget");
    const ok = await requestPinWidget({ widgetName: COMPOSE_WIDGET_NAME });
    if (!ok) {
      Alert.alert(
        "Home widget",
        "Couldn't add the widget automatically. Long-press the home screen, tap Widgets, and pick Jarvis.",
      );
    }
  } catch {
    Alert.alert(
      "Home widget",
      "Widgets need a native Android build. From this project run npx expo run:android.",
    );
  }
}
