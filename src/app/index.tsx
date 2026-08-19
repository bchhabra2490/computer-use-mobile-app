import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { HomeScreen } from "@/components/home-screen";
import { useJarvis } from "@/state/jarvis-context";
import { colors } from "@/theme";

export default function Index() {
  const { ready, pairing } = useJarvis();

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!pairing) {
    return <Redirect href="/pair" />;
  }

  return <HomeScreen />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
