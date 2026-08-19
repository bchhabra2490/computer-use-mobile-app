import { useEffect, useState } from "react";

import {
  consumeComposeIntent,
  getComposeIntent,
  subscribeComposeIntent,
  type ComposeIntent,
} from "@/state/compose-intent";

export function useComposeIntent(): ComposeIntent | null {
  const [intent, setIntent] = useState<ComposeIntent | null>(getComposeIntent);

  useEffect(() => subscribeComposeIntent(setIntent), []);

  return intent;
}

export { consumeComposeIntent };
