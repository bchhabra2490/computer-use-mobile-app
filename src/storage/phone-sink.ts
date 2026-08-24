import * as SecureStore from "expo-secure-store";

const PHONE_SINK_KEY = "jarvis.phoneSink.v1";

/** Default on: this is a phone companion, replies play here until the user turns it off. */
export const DEFAULT_PHONE_SINK = true;

export async function loadPhoneSink(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(PHONE_SINK_KEY);
    if (raw === null) return DEFAULT_PHONE_SINK;
    return raw === "1" || raw === "true";
  } catch {
    return DEFAULT_PHONE_SINK;
  }
}

export async function savePhoneSink(on: boolean): Promise<void> {
  await SecureStore.setItemAsync(PHONE_SINK_KEY, on ? "1" : "0");
}
