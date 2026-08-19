import { getStatus, isUnauthorized } from "@/api/client";
import { openStatusSse } from "@/api/sse";
import type { StatusPayload } from "@/api/types";
import type { Pairing } from "@/storage/pairing";

export type ConnectionState = "connected" | "reconnecting" | "offline";

const BACKOFF_MS = [1000, 2000, 5000, 15000] as const;
const POLL_MS = 1000;

export type StatusSessionHandlers = {
  onStatus: (status: StatusPayload) => void;
  onConnection: (state: ConnectionState) => void;
  onAuthError: () => void;
};

function capBackoff(index: number): number {
  return BACKOFF_MS[Math.min(index, BACKOFF_MS.length - 1)] ?? 15000;
}

export function startStatusSession(
  pairing: Pairing,
  handlers: StatusSessionHandlers,
): () => void {
  let generation = 0;
  let stopped = false;
  let backoffIndex = 0;
  let sseClose: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let polling = false;

  const clearPoll = () => {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    polling = false;
  };

  const clearRetry = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const closeSse = () => {
    sseClose?.();
    sseClose = null;
  };

  const cleanupNet = () => {
    closeSse();
    clearPoll();
  };

  const scheduleFullRetry = () => {
    clearRetry();
    const wait = capBackoff(backoffIndex);
    backoffIndex += 1;
    retryTimer = setTimeout(() => {
      void connect();
    }, wait);
  };

  const startPoll = (my: number) => {
    if (polling) return;
    polling = true;
    const tick = async () => {
      if (stopped || my !== generation || !polling) return;
      try {
        const status = await getStatus(pairing);
        if (stopped || my !== generation || !polling) return;
        backoffIndex = 0;
        handlers.onConnection("connected");
        handlers.onStatus(status);
        pollTimer = setTimeout(() => void tick(), POLL_MS);
      } catch (error) {
        if (stopped || my !== generation || !polling) return;
        if (isUnauthorized(error)) {
          handlers.onAuthError();
          return;
        }
        handlers.onConnection("offline");
        pollTimer = setTimeout(() => void tick(), POLL_MS);
      }
    };
    void tick();
  };

  const attachSse = (my: number) => {
    closeSse();
    sseClose = openStatusSse(pairing, {
      onOpen() {
        if (stopped || my !== generation) return;
        backoffIndex = 0;
        clearPoll();
        handlers.onConnection("connected");
      },
      onStatus(status) {
        if (stopped || my !== generation) return;
        backoffIndex = 0;
        clearPoll();
        handlers.onConnection("connected");
        handlers.onStatus(status);
      },
      onAuthError() {
        if (stopped || my !== generation) return;
        closeSse();
        handlers.onAuthError();
      },
      onError() {
        if (stopped || my !== generation) return;
        sseClose = null;
        startPoll(my);
        clearRetry();
        const wait = capBackoff(backoffIndex);
        backoffIndex += 1;
        retryTimer = setTimeout(() => {
          if (stopped || my !== generation) return;
          attachSse(my);
        }, wait);
      },
    });
  };

  const connect = async () => {
    if (stopped) return;
    const my = ++generation;
    cleanupNet();
    clearRetry();
    handlers.onConnection("reconnecting");

    try {
      const status = await getStatus(pairing);
      if (stopped || my !== generation) return;
      backoffIndex = 0;
      handlers.onConnection("connected");
      handlers.onStatus(status);
    } catch (error) {
      if (stopped || my !== generation) return;
      if (isUnauthorized(error)) {
        handlers.onAuthError();
        return;
      }
      handlers.onConnection("offline");
      scheduleFullRetry();
      return;
    }

    attachSse(my);
  };

  void connect();

  return () => {
    stopped = true;
    generation += 1;
    cleanupNet();
    clearRetry();
  };
}
