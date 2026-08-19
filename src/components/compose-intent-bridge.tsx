import * as Linking from "expo-linking";
import { useEffect } from "react";

import { parseComposeUrl, pushComposeIntent } from "@/state/compose-intent";

export function ComposeIntentBridge() {
  useEffect(() => {
    const apply = (url: string | null) => {
      const parsed = parseComposeUrl(url);
      if (parsed) pushComposeIntent(parsed);
    };
    void Linking.getInitialURL().then(apply);
    const sub = Linking.addEventListener("url", (event) => apply(event.url));
    return () => sub.remove();
  }, []);
  return null;
}
