import { Platform, StyleSheet } from "react-native";

export const colors = {
  bg: "#0B0C0F",
  surface: "#14161A",
  elevated: "#1A1D23",
  border: "#2C3038",
  borderStrong: "#3C424C",
  text: "#E6E8EC",
  muted: "#8D939C",
  faint: "#5C636C",
  accent: "#8B97A6",
  accentFill: "#E6E8EC",
  accentOnFill: "#12141A",
  listening: "#6F8578",
  speaking: "#8B97A6",
  progress: "#9A8B63",
  ask: "#9A7F68",
  error: "#B07872",
  errorFill: "#241C1C",
  errorBorder: "#5A3E3C",
  done: "#6F8578",
  offline: "#6A7078",
  queued: "#8D8A82",
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 10,
} as const;

export const fonts = {
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) as string,
};

export const hairline = StyleSheet.hairlineWidth;

export function stateColor(state: string): string {
  switch (state) {
    case "listening":
      return colors.listening;
    case "speaking":
      return colors.speaking;
    case "thinking":
    case "agent":
      return colors.progress;
    case "ask":
    case "ask_user":
      return colors.ask;
    case "error":
      return colors.error;
    case "done":
      return colors.done;
    case "idle":
    case "ready":
    case "waiting":
    default:
      return colors.muted;
  }
}

export function connectionColor(state: "connected" | "reconnecting" | "offline"): string {
  switch (state) {
    case "connected":
      return colors.listening;
    case "reconnecting":
      return colors.progress;
    case "offline":
      return colors.offline;
  }
}

export function connectionLabel(state: "connected" | "reconnecting" | "offline"): string {
  switch (state) {
    case "connected":
      return "Linked";
    case "reconnecting":
      return "Linking";
    case "offline":
      return "Offline";
  }
}
