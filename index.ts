import { NativeModules, Platform } from "react-native";

function registerAndroidWidgetTask(): void {
  if (Platform.OS !== "android") return;
  try {
    // Expo Go has no AndroidWidget native module; importing the package
    // uses TurboModuleRegistry.getEnforcing and would crash startup.
    if (!NativeModules.AndroidWidget && !(globalThis as { __turboModuleProxy?: unknown }).__turboModuleProxy) {
      return;
    }
    // require keeps this after the Expo Go guard (static import would crash Expo Go).
    const { registerWidgetTaskHandler } = require("react-native-android-widget") as {
      registerWidgetTaskHandler: (handler: unknown) => void;
    };
    const { widgetTaskHandler } = require("./src/widget/task-handler") as {
      widgetTaskHandler: unknown;
    };
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Expo Go or unlinked native module
  }
}

registerAndroidWidgetTask();
require("expo-router/entry");
