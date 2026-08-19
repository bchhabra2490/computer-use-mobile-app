import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { pushComposeIntent, type ComposeAction } from "@/state/compose-intent";
import { useJarvis } from "@/state/jarvis-context";

const ACTIONS = new Set<ComposeAction>(["type", "mic", "cam"]);

export default function ComposeScreen() {
  const { ready, pairing } = useJarvis();
  const params = useLocalSearchParams<{ action?: string | string[]; text?: string | string[] }>();

  useEffect(() => {
    const action = Array.isArray(params.action) ? params.action[0] : params.action;
    const text = Array.isArray(params.text) ? params.text[0] : params.text;
    if (!action || !ACTIONS.has(action as ComposeAction)) return;
    pushComposeIntent({
      action: action as ComposeAction,
      text: typeof text === "string" ? text : undefined,
    });
  }, [params.action, params.text]);

  if (!ready) return null;
  if (!pairing) return <Redirect href="/pair" />;
  return <Redirect href="/" />;
}
