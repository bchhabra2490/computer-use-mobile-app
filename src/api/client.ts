import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";

import { originOf, type Pairing } from "@/storage/pairing";

import {
  isErrorPayload,
  parseHealthPayload,
  parseStatusPayload,
  type AudioResponse,
  type CommandResponse,
  type ControlAction,
  type ControlResponse,
  type HealthPayload,
  type PhotoResponse,
  type StatusPayload,
} from "./types";

export const HEALTH_TIMEOUT_MS = 8000;
export const REQUEST_TIMEOUT_MS = 5000;
export const SCREEN_TIMEOUT_MS = 8000;
export const AUDIO_TIMEOUT_MS = 20000;
export const PHOTO_TIMEOUT_MS = 20000;
export const SPEECH_TIMEOUT_MS = 15000;
export const AUDIO_MAX_BYTES = 2_500_000;
export const AUDIO_MAX_SECONDS = 30;
export const PHOTO_MAX_BYTES = 6_000_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.code === "unauthorized");
}

function authHeaders(token: string, json = false): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(res.status, "invalid_json", `Unexpected response (${res.status})`);
  }
}

function throwIfFailed(res: Response, body: unknown, origin: string): void {
  if (res.status === 401 || (isErrorPayload(body) && body.error === "unauthorized")) {
    throw new ApiError(401, "unauthorized", "token rejected, re-pair");
  }
  if (!res.ok) {
    const message = isErrorPayload(body)
      ? body.error
      : `Request failed (${res.status}) at ${origin}`;
    throw new ApiError(res.status, "http", message);
  }
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  origin: string,
): Promise<{ res: Response; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await readJson(res);
    throwIfFailed(res, body, origin);
    return { res, body };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(0, "timeout", `Timed out reaching ${origin}`);
    }
    throw new ApiError(0, "network", `Can't reach Mac at ${origin}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function getHealth(
  pairing: Pick<Pairing, "host" | "port">,
  timeoutMs: number = HEALTH_TIMEOUT_MS,
): Promise<HealthPayload> {
  const origin = originOf(pairing);
  const { body } = await fetchJson(
    `${origin}/v1/health`,
    { method: "GET", headers: { Accept: "application/json" } },
    timeoutMs,
    origin,
  );
  try {
    return parseHealthPayload(body);
  } catch (error) {
    throw new ApiError(
      0,
      "invalid_health",
      error instanceof Error ? error.message : "health check failed",
    );
  }
}

export async function getStatus(
  pairing: Pairing,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<StatusPayload> {
  const origin = originOf(pairing);
  const { body } = await fetchJson(
    `${origin}/v1/status`,
    { method: "GET", headers: authHeaders(pairing.token) },
    timeoutMs,
    origin,
  );
  try {
    return parseStatusPayload(body);
  } catch (error) {
    if (error instanceof Error && error.message === "unauthorized") {
      throw new ApiError(401, "unauthorized", "token rejected, re-pair");
    }
    throw new ApiError(
      0,
      "invalid_status",
      error instanceof Error ? error.message : "invalid status",
    );
  }
}

export async function postCommand(
  pairing: Pairing,
  text: string,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<CommandResponse> {
  const origin = originOf(pairing);
  const { body } = await fetchJson(
    `${origin}/v1/command`,
    {
      method: "POST",
      headers: authHeaders(pairing.token, true),
      body: JSON.stringify({ text }),
    },
    timeoutMs,
    origin,
  );
  if (typeof body !== "object" || body === null) {
    throw new ApiError(0, "invalid_response", "invalid command response");
  }
  const o = body as Record<string, unknown>;
  if (o.ok !== true) {
    throw new ApiError(400, "http", isErrorPayload(body) ? body.error : "command failed");
  }
  return {
    ok: true,
    queued: Boolean(o.queued),
    text: typeof o.text === "string" ? o.text : text,
  };
}

export async function postControl(
  pairing: Pairing,
  action: ControlAction,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<ControlResponse> {
  const origin = originOf(pairing);
  const { body } = await fetchJson(
    `${origin}/v1/control`,
    {
      method: "POST",
      headers: authHeaders(pairing.token, true),
      body: JSON.stringify({ action }),
    },
    timeoutMs,
    origin,
  );
  if (typeof body !== "object" || body === null) {
    throw new ApiError(0, "invalid_response", "invalid control response");
  }
  const o = body as Record<string, unknown>;
  if (o.ok !== true) {
    throw new ApiError(400, "http", isErrorPayload(body) ? body.error : "control failed");
  }
  return {
    ok: true,
    action: typeof o.action === "string" ? o.action : action,
  };
}

export function mimeFromAudioUri(uri: string): string {
  const lower = uri.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a") || lower.endsWith(".aac") || lower.endsWith(".mp4")) {
    return "audio/m4a";
  }
  if (lower.endsWith(".3gp")) return "audio/3gpp";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "audio/m4a";
}

export function mimeFromImageUri(uri: string): string {
  const lower = uri.split("?")[0]?.toLowerCase() ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function parseAudioResponse(body: unknown): AudioResponse {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(0, "invalid_response", "invalid audio response");
  }
  const o = body as Record<string, unknown>;
  if (o.ok !== true) {
    throw new ApiError(400, "http", isErrorPayload(body) ? body.error : "audio failed");
  }
  return {
    ok: true,
    queued: Boolean(o.queued),
    text: typeof o.text === "string" ? o.text : "",
    source: typeof o.source === "string" ? o.source : "audio",
  };
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function readLocalBase64(
  uri: string,
  missingMessage: string,
): Promise<{ base64: string; bytes: number; filename: string }> {
  const fallbackName = uri.split("/").pop()?.split("?")[0] || "file.bin";
  if (Platform.OS === "web") {
    const fileRes = await fetch(uri);
    const buffer = await fileRes.arrayBuffer();
    return {
      base64: bytesToBase64(buffer),
      bytes: buffer.byteLength,
      filename: fallbackName,
    };
  }

  const file = new File(uri);
  if (!file.exists) {
    throw new ApiError(400, "missing_file", missingMessage);
  }
  const bytes = file.size;
  const base64 = await file.base64();
  return {
    base64,
    bytes,
    filename: file.name || fallbackName,
  };
}

export async function postAudioFile(
  pairing: Pairing,
  uri: string,
  contentType: string = mimeFromAudioUri(uri),
  timeoutMs: number = AUDIO_TIMEOUT_MS,
): Promise<AudioResponse> {
  const { base64, bytes, filename } = await readLocalBase64(
    uri,
    "Couldn't read the recorded clip.",
  );
  if (bytes === 0 || !base64) {
    throw new ApiError(400, "audio required", "audio required");
  }
  if (bytes > AUDIO_MAX_BYTES) {
    throw new ApiError(400, "audio too large", "audio too large");
  }
  const origin = originOf(pairing);
  const { body } = await fetchJson(
    `${origin}/v1/audio`,
    {
      method: "POST",
      headers: authHeaders(pairing.token, true),
      body: JSON.stringify({
        audio: base64,
        mime: contentType,
        filename,
      }),
    },
    timeoutMs,
    origin,
  );
  return parseAudioResponse(body);
}

function parsePhotoResponse(body: unknown): PhotoResponse {
  if (typeof body !== "object" || body === null) {
    throw new ApiError(0, "invalid_response", "invalid photo response");
  }
  const o = body as Record<string, unknown>;
  if (o.ok !== true) {
    throw new ApiError(400, "http", isErrorPayload(body) ? body.error : "photo failed");
  }
  return {
    ok: true,
    queued: Boolean(o.queued),
    text: typeof o.text === "string" ? o.text : "",
    source: typeof o.source === "string" ? o.source : "photo",
    caption_source: typeof o.caption_source === "string" ? o.caption_source : undefined,
    width: typeof o.width === "number" ? o.width : null,
    height: typeof o.height === "number" ? o.height : null,
  };
}

export async function postPhotoFile(
  pairing: Pairing,
  uri: string,
  text?: string,
  audioUri?: string,
  contentType: string = mimeFromImageUri(uri),
  timeoutMs: number = PHOTO_TIMEOUT_MS,
): Promise<PhotoResponse> {
  const { base64, bytes, filename } = await readLocalBase64(
    uri,
    "Couldn't read the photo.",
  );
  if (bytes === 0 || !base64) {
    throw new ApiError(400, "photo required", "photo required");
  }
  if (bytes > PHOTO_MAX_BYTES) {
    throw new ApiError(400, "photo too large", "photo too large");
  }

  let audio: string | undefined;
  let audioMime: string | undefined;
  let audioFilename: string | undefined;
  if (audioUri) {
    const clip = await readLocalBase64(audioUri, "Couldn't read the recorded clip.");
    if (clip.bytes === 0 || !clip.base64) {
      throw new ApiError(400, "audio required", "audio required");
    }
    if (clip.bytes > AUDIO_MAX_BYTES) {
      throw new ApiError(400, "audio too large", "audio too large");
    }
    audio = clip.base64;
    audioMime = mimeFromAudioUri(audioUri);
    audioFilename = clip.filename;
  }

  const caption = text?.trim() ?? "";
  const origin = originOf(pairing);
  const { body } = await fetchJson(
    `${origin}/v1/photo`,
    {
      method: "POST",
      headers: authHeaders(pairing.token, true),
      body: JSON.stringify({
        photo: base64,
        mime: contentType,
        filename,
        ...(caption ? { text: caption } : {}),
        ...(audio
          ? { audio, audio_mime: audioMime, audio_filename: audioFilename }
          : {}),
      }),
    },
    timeoutMs,
    origin,
  );
  return parsePhotoResponse(body);
}

export function screenUrl(base: string, token: string, at: number): string {
  return `${base}/v1/screen?token=${encodeURIComponent(token)}&t=${at}`;
}

function jpegToDataUri(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/jpeg;base64,${btoa(binary)}`;
}

export type ScreenFetchResult =
  | { ok: true; uri: string; at: number }
  | { ok: false; missing: true; at: number };

export async function getScreen(
  pairing: Pairing,
  at: number,
  timeoutMs: number = SCREEN_TIMEOUT_MS,
): Promise<ScreenFetchResult> {
  const origin = originOf(pairing);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${origin}/v1/screen?t=${encodeURIComponent(String(at))}`, {
      method: "GET",
      headers: {
        Accept: "image/jpeg",
        Authorization: `Bearer ${pairing.token}`,
      },
      signal: controller.signal,
    });

    if (res.status === 401) {
      throw new ApiError(401, "unauthorized", "token rejected, re-pair");
    }
    if (res.status === 404) {
      return { ok: false, missing: true, at };
    }
    if (!res.ok) {
      throw new ApiError(res.status, "http", `Screen failed (${res.status})`);
    }

    if (Platform.OS === "web") {
      const blob = await res.blob();
      return { ok: true, uri: URL.createObjectURL(blob), at };
    }

    try {
      const buffer = await res.arrayBuffer();
      return { ok: true, uri: jpegToDataUri(buffer), at };
    } catch {
      return { ok: true, uri: screenUrl(origin, pairing.token, at), at };
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(0, "timeout", "Timed out loading screen");
    }
    throw new ApiError(0, "network", "Can't load Mac screen");
  } finally {
    clearTimeout(timer);
  }
}

export type SpeechFetchResult =
  | { ok: true; uri: string; at: number }
  | { ok: false; missing: true; at: number };

export function speechUrl(base: string, token: string, at: number): string {
  return `${base}/v1/speech?token=${encodeURIComponent(token)}&t=${at}`;
}

export async function getSpeech(
  pairing: Pairing,
  at: number,
  timeoutMs: number = SPEECH_TIMEOUT_MS,
): Promise<SpeechFetchResult> {
  const origin = originOf(pairing);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${origin}/v1/speech?t=${encodeURIComponent(String(at))}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "audio/wav",
        Authorization: `Bearer ${pairing.token}`,
      },
      signal: controller.signal,
    });

    if (res.status === 401) {
      throw new ApiError(401, "unauthorized", "token rejected, re-pair");
    }
    if (res.status === 404) {
      return { ok: false, missing: true, at };
    }
    if (!res.ok) {
      throw new ApiError(res.status, "http", `Speech failed (${res.status})`);
    }

    if (Platform.OS === "web") {
      const blob = await res.blob();
      return { ok: true, uri: URL.createObjectURL(blob), at };
    }

    const dest = new File(Paths.cache, `jarvis-phone-tts-${at}.wav`);
    dest.write(new Uint8Array(await res.arrayBuffer()));
    return { ok: true, uri: dest.uri, at };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(0, "timeout", "Timed out loading speech");
    }
    throw new ApiError(0, "network", "Can't load phone speech");
  } finally {
    clearTimeout(timer);
  }
}

export type TestResult =
  | { ok: true; health: HealthPayload; status: StatusPayload }
  | { ok: false; error: string };

export async function testConnection(pairing: Pairing): Promise<TestResult> {
  try {
    const health = await getHealth(pairing);
    const status = await getStatus(pairing);
    return { ok: true, health, status };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
