import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "@/components/app-button";
import { PairingForm } from "@/components/pairing-form";
import { useJarvis } from "@/state/jarvis-context";
import { originOf } from "@/storage/pairing";
import { colors, fonts } from "@/theme";
import { pinComposeWidget } from "@/widget/sync";

export default function SettingsScreen() {
  const { pairing, connection, savePairingAndConnect, forgetMac } = useJarvis();

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      {pairing ? (
        <Text style={styles.meta}>
          {originOf(pairing)} · {connection}
        </Text>
      ) : null}
      <PairingForm
        initial={pairing}
        saveLabel="Save"
        onSave={async (next) => {
          await savePairingAndConnect(next);
          router.replace("/");
        }}
        footer={
          <View style={styles.forget}>
            {Platform.OS === "android" ? (
              <View style={styles.widget}>
                <Text style={styles.widgetCopy}>
                  Home widget: command field, MIC, and CAM. Taps open the app — Android cannot
                  type or record inside the widget itself.
                </Text>
                <AppButton label="Add home widget" onPress={() => void pinComposeWidget()} />
              </View>
            ) : null}
            <AppButton
              label="Forget Mac"
              variant="danger"
              onPress={() => {
                Alert.alert(
                  "Forget this Mac?",
                  "The saved host and token will be removed. Pair again to reconnect.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Forget",
                      style: "destructive",
                      onPress: () => {
                        void (async () => {
                          await forgetMac();
                          router.replace("/pair");
                        })();
                      },
                    },
                  ],
                );
              }}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.mono,
    paddingHorizontal: 20,
    paddingTop: 8,
    letterSpacing: 0.2,
  },
  forget: {
    marginTop: 28,
    gap: 16,
  },
  widget: {
    gap: 10,
  },
  widgetCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
