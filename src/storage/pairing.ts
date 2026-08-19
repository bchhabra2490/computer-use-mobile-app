import * as SecureStore from "expo-secure-store";

const PAIRING_KEY = "jarvis.pairing.v1";

export const DEFAULT_PORT = 8742;
export const TOKEN_LENGTH = 5;

export type Pairing = {
  host: string;
  port: number;
  token: string;
};

export function originOf(pairing: Pick<Pairing, "host" | "port">): string {
  return `http://${formatHost(pairing.host)}:${pairing.port}`;
}

function formatHost(host: string): string {
  if (host.includes(":") && !host.startsWith("[")) {
    return `[${host}]`;
  }
  return host;
}

export function normalizeToken(raw: string): string {
  return raw.replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
}

export function isValidToken(token: string): boolean {
  return token.length === TOKEN_LENGTH;
}

export function parseHostPort(
  raw: string,
  fallbackPort: number = DEFAULT_PORT,
): { host: string; port: number } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { host: "", port: fallbackPort };
  }

  try {
    if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/")) {
      const url = new URL(
        /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`,
      );
      const port = url.port ? Number(url.port) : fallbackPort;
      return { host: url.hostname, port };
    }
  } catch {
    // fall through to host[:port]
  }

  const ipv6 = trimmed.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (ipv6?.[1]) {
    return {
      host: ipv6[1],
      port: ipv6[2] ? Number(ipv6[2]) : fallbackPort,
    };
  }

  const colon = trimmed.lastIndexOf(":");
  if (colon > 0) {
    const maybePort = trimmed.slice(colon + 1);
    if (/^\d+$/.test(maybePort)) {
      return { host: trimmed.slice(0, colon), port: Number(maybePort) };
    }
  }

  return { host: trimmed, port: fallbackPort };
}

export function maskToken(token: string): string {
  if (token.length <= 2) return "•••••";
  return `${"•".repeat(Math.max(token.length - 2, 1))}${token.slice(-2)}`;
}

export async function loadPairing(): Promise<Pairing | null> {
  try {
    const raw = await SecureStore.getItemAsync(PAIRING_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.host !== "string" || typeof o.token !== "string") return null;
    const port = typeof o.port === "number" ? o.port : Number(o.port);
    if (!Number.isFinite(port) || port <= 0) return null;
    const host = o.host.trim();
    const token = normalizeToken(o.token);
    if (!host || !token) return null;
    return { host, port, token };
  } catch {
    return null;
  }
}

export async function savePairing(pairing: Pairing): Promise<void> {
  const payload: Pairing = {
    host: pairing.host.trim(),
    port: pairing.port,
    token: normalizeToken(pairing.token),
  };
  await SecureStore.setItemAsync(PAIRING_KEY, JSON.stringify(payload));
}

export async function clearPairing(): Promise<void> {
  await SecureStore.deleteItemAsync(PAIRING_KEY);
}
