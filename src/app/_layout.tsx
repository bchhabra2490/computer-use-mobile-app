import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, type ReactNode } from "react";

import { ComposeIntentBridge } from "@/components/compose-intent-bridge";
import { JarvisProvider } from "@/state/JarvisProvider";
import { useJarvis } from "@/state/jarvis-context";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

function SplashGate({ children }: { children: ReactNode }) {
  const { ready } = useJarvis();

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <JarvisProvider>
      <StatusBar style="light" />
      <ComposeIntentBridge />
      <SplashGate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontSize: 15,
              fontWeight: "600",
            },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: "fade",
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="pair" options={{ headerShown: false }} />
          <Stack.Screen name="compose" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
        </Stack>
      </SplashGate>
    </JarvisProvider>
  );
}
