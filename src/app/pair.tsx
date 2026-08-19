import { Redirect, router } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PairingForm } from "@/components/pairing-form";
import { useJarvis } from "@/state/jarvis-context";
import { colors } from "@/theme";

export default function PairScreen() {
  const { pairing, savePairingAndConnect } = useJarvis();

  if (pairing) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <PairingForm
        onSave={async (next) => {
          await savePairingAndConnect(next);
          router.replace("/");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
