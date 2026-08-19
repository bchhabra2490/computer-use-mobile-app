export const COMPOSE_WIDGET_NAME = "JarvisCompose";

export type ComposeAction = "type" | "mic" | "cam";

export type ComposeIntent = {
  id: number;
  action: ComposeAction;
  text?: string;
};

const ACTIONS = new Set<ComposeAction>(["type", "mic", "cam"]);

let current: ComposeIntent | null = null;
let lastPushKey = "";
let lastPushAt = 0;
const listeners = new Set<(intent: ComposeIntent | null) => void>();

export function composeUrl(action: ComposeAction, text?: string): string {
  const params = new URLSearchParams({ action });
  if (text?.trim()) params.set("text", text.trim());
  return `jarvisremote://compose?${params.toString()}`;
}

export function parseComposeUrl(url: string | null | undefined): ComposeIntent | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const hostOrPath = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
    if (!hostOrPath.includes("compose")) return null;
    const action = parsed.searchParams.get("action") as ComposeAction | null;
    if (!action || !ACTIONS.has(action)) return null;
    const text = parsed.searchParams.get("text")?.trim();
    return {
      id: Date.now(),
      action,
      text: text || undefined,
    };
  } catch {
    return null;
  }
}

export function pushComposeIntent(intent: Omit<ComposeIntent, "id"> | ComposeIntent): void {
  const key = `${intent.action}:${intent.text ?? ""}`;
  const now = Date.now();
  if (key === lastPushKey && now - lastPushAt < 800) return;
  lastPushKey = key;
  lastPushAt = now;
  current = {
    id: "id" in intent && intent.id ? intent.id : now,
    action: intent.action,
    text: intent.text,
  };
  listeners.forEach((listener) => listener(current));
}

export function consumeComposeIntent(id?: number): void {
  if (id !== undefined && current?.id !== id) return;
  current = null;
  listeners.forEach((listener) => listener(null));
}

export function getComposeIntent(): ComposeIntent | null {
  return current;
}

export function subscribeComposeIntent(
  listener: (intent: ComposeIntent | null) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
