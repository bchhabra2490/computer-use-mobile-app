import { originOf, type Pairing } from "@/storage/pairing";

import { parseStatusPayload, type StatusPayload } from "./types";

export type SseHandlers = {
  onStatus: (status: StatusPayload) => void;
  onError: () => void;
  onAuthError: () => void;
  onOpen?: () => void;
};

export function consumeSse(buffer: string): {
  rest: string;
  frames: { event: string; data: string }[];
} {
  const normalized = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const frames: { event: string; data: string }[] = [];
  let rest = normalized;

  while (true) {
    const idx = rest.indexOf("\n\n");
    if (idx < 0) break;
    const raw = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    let event = "message";
    const dataLines: string[] = [];
    for (const line of raw.split("\n")) {
      if (line.startsWith(":") || line.length === 0) continue;
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length > 0) {
      frames.push({ event, data: dataLines.join("\n") });
    }
  }

  return { rest, frames };
}

function handleFrame(event: string, data: string, handlers: SseHandlers): void {
  if (event !== "status" && event !== "message") return;
  try {
    const parsed: unknown = JSON.parse(data);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as { error?: unknown }).error === "unauthorized"
    ) {
      handlers.onAuthError();
      return;
    }
    handlers.onStatus(parseStatusPayload(parsed));
  } catch {
    // skip malformed frames
  }
}

export function openStatusSse(pairing: Pairing, handlers: SseHandlers): () => void {
  const origin = originOf(pairing);
  const xhr = new XMLHttpRequest();
  let processed = 0;
  let carry = "";
  let closed = false;

  const fail = () => {
    if (closed) return;
    closed = true;
    xhr.abort();
    handlers.onError();
  };

  xhr.open("GET", `${origin}/v1/events`);
  xhr.setRequestHeader("Accept", "text/event-stream");
  xhr.setRequestHeader("Cache-Control", "no-cache");
  xhr.setRequestHeader("Authorization", `Bearer ${pairing.token}`);
  xhr.responseType = "text";

  xhr.onreadystatechange = () => {
    if (xhr.readyState < 2 || closed) return;
    if (xhr.status === 401) {
      closed = true;
      xhr.abort();
      handlers.onAuthError();
      return;
    }
    if (xhr.status >= 400) {
      fail();
      return;
    }
    if (xhr.status === 200) {
      handlers.onOpen?.();
    }
  };

  xhr.onprogress = () => {
    if (closed) return;
    const text = xhr.responseText ?? "";
    const chunk = text.slice(processed);
    processed = text.length;
    if (!chunk) return;
    const { rest, frames } = consumeSse(carry + chunk);
    carry = rest;
    for (const frame of frames) {
      handleFrame(frame.event, frame.data, handlers);
    }
  };

  xhr.onerror = fail;
  xhr.onabort = () => {
    if (!closed) {
      closed = true;
      handlers.onError();
    }
  };
  xhr.onload = fail;

  try {
    xhr.send();
  } catch {
    fail();
  }

  return () => {
    closed = true;
    xhr.abort();
  };
}
