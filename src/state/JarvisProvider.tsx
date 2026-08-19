import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { ApiError, getScreen, getSpeech, getStatus, isUnauthorized, postAudioFile, postCommand, postControl, postPhotoFile } from "@/api/client";
import type { ControlAction, StatusPayload } from "@/api/types";
import { startStatusSession, type ConnectionState } from "@/state/connection";
import {
  JarvisContext,
  type JarvisContextValue,
  type SentCommand,
} from "@/state/jarvis-context";
import {
  clearPairing as clearStoredPairing,
  loadPairing,
  savePairing,
  type Pairing,
} from "@/storage/pairing";
import { syncComposeWidget } from "@/widget/sync";

function logsMatchCommand(logs: string[], text: string): boolean {
  return logs.some((line) => line.includes("[user]") && line.includes(text));
}

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("offline");
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sentCommands, setSentCommands] = useState<SentCommand[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [screenUri, setScreenUri] = useState<string | null>(null);
  const [screenLoading, setScreenLoading] = useState(false);
  const [speechPlaying, setSpeechPlaying] = useState(false);
  const sawQueuedRef = useRef(false);
  const lastScreenAtRef = useRef<number | null>(null);
  const wantedScreenAtRef = useRef<number | null>(null);
  const screenUriRef = useRef<string | null>(null);
  const lastSpeechAtRef = useRef<number | null>(null);
  const wantedSpeechAtRef = useRef<number | null>(null);
  const speechUriRef = useRef<string | null>(null);
  const speechPrimedRef = useRef(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const [resumeToken, setResumeToken] = useState(0);
  const [screenEpoch, setScreenEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadPairing();
      if (cancelled) return;
      setPairing(stored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyStatus = useCallback((next: StatusPayload) => {
    setStatus(next);
    setPendingText((current) => {
      if (!current) return null;
      if (next.queued) {
        sawQueuedRef.current = true;
        return current;
      }
      if (logsMatchCommand(next.logs, current) || sawQueuedRef.current) {
        sawQueuedRef.current = false;
        return null;
      }
      return current;
    });
  }, []);

  const resetScreen = useCallback(() => {
    const prev = screenUriRef.current;
    if (prev && prev.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        // web-only
      }
    }
    screenUriRef.current = null;
    lastScreenAtRef.current = null;
    wantedScreenAtRef.current = null;
    setScreenUri(null);
    setScreenLoading(false);
  }, []);

  const stopSpeech = useCallback(() => {
    const prev = speechUriRef.current;
    if (prev && prev.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(prev);
      } catch {
        // web-only
      }
    }
    speechUriRef.current = null;
    lastSpeechAtRef.current = null;
    wantedSpeechAtRef.current = null;
    speechPrimedRef.current = false;
    try {
      playerRef.current?.pause();
    } catch {
      // player may already be released
    }
    setSpeechPlaying(false);
  }, []);

  useEffect(() => {
    const player = createAudioPlayer(null);
    playerRef.current = player;
    const sub = player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
      setSpeechPlaying(Boolean(status.playing));
    });
    return () => {
      sub.remove();
      player.remove();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") setResumeToken((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!pairing) {
      setConnection("offline");
      setStatus(null);
      return;
    }

    setAuthError(null);
    const stop = startStatusSession(pairing, {
      onStatus: applyStatus,
      onConnection: setConnection,
      onAuthError: () => {
        setAuthError("token rejected, re-pair");
        setConnection("offline");
      },
    });

    return () => stop();
  }, [pairing, applyStatus, resumeToken]);

  useEffect(() => {
    if (!pairing) {
      resetScreen();
      return;
    }
    const at = status?.screen_at ?? null;
    if (typeof at !== "number") {
      return;
    }
    if (at === lastScreenAtRef.current) {
      return;
    }
    wantedScreenAtRef.current = at;
    let cancelled = false;
    setScreenLoading(true);
    void (async () => {
      try {
        const result = await getScreen(pairing, at);
        if (cancelled || wantedScreenAtRef.current !== at) return;
        lastScreenAtRef.current = at;
        if (result.ok) {
          const prev = screenUriRef.current;
          if (prev && prev.startsWith("blob:") && prev !== result.uri) {
            try {
              URL.revokeObjectURL(prev);
            } catch {
              // web-only
            }
          }
          screenUriRef.current = result.uri;
          setScreenUri(result.uri);
        }
      } catch (error) {
        if (cancelled || wantedScreenAtRef.current !== at) return;
        lastScreenAtRef.current = at;
        if (isUnauthorized(error)) {
          setAuthError("token rejected, re-pair");
        }
      } finally {
        if (!cancelled && wantedScreenAtRef.current === at) {
          setScreenLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pairing, status?.screen_at, screenEpoch, resetScreen]);

  useEffect(() => {
    if (!pairing) {
      stopSpeech();
      return;
    }
    if (status == null) {
      return;
    }
    const at = status.speech_at;
    if (!speechPrimedRef.current) {
      speechPrimedRef.current = true;
      lastSpeechAtRef.current = typeof at === "number" ? at : null;
      return;
    }
    if (typeof at !== "number") {
      return;
    }
    if (at === lastSpeechAtRef.current) {
      return;
    }
    wantedSpeechAtRef.current = at;
    let cancelled = false;
    void (async () => {
      try {
        const result = await getSpeech(pairing, at);
        if (cancelled || wantedSpeechAtRef.current !== at) return;
        lastSpeechAtRef.current = at;
        if (!result.ok) return;
        const prev = speechUriRef.current;
        if (prev && prev.startsWith("blob:") && prev !== result.uri) {
          try {
            URL.revokeObjectURL(prev);
          } catch {
            // web-only
          }
        }
        speechUriRef.current = result.uri;
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
        const player = playerRef.current;
        if (!player) return;
        player.replace({ uri: result.uri });
        player.play();
      } catch (error) {
        if (cancelled || wantedSpeechAtRef.current !== at) return;
        lastSpeechAtRef.current = at;
        if (isUnauthorized(error)) {
          setAuthError("token rejected, re-pair");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pairing, status != null, status?.speech_at, stopSpeech]);

  const savePairingAndConnect = useCallback(async (next: Pairing) => {
    await savePairing(next);
    setAuthError(null);
    setActionError(null);
    setStatus(null);
    resetScreen();
    stopSpeech();
    setPairing(next);
    setConnection("reconnecting");
    void syncComposeWidget();
  }, [resetScreen, stopSpeech]);

  const forgetMac = useCallback(async () => {
    await clearStoredPairing();
    setPairing(null);
    setStatus(null);
    setAuthError(null);
    setActionError(null);
    setPendingText(null);
    setSentCommands([]);
    resetScreen();
    stopSpeech();
    setConnection("offline");
    void syncComposeWidget();
  }, [resetScreen, stopSpeech]);

  const sendCommand = useCallback(
    async (text: string) => {
      const current = pairing;
      if (!current) {
        throw new ApiError(0, "unpaired", "Not paired with a Mac");
      }
      const trimmed = text.trim();
      if (!trimmed) {
        throw new ApiError(400, "text required", "text required");
      }
      setActionError(null);
      try {
        const result = await postCommand(current, trimmed);
        sawQueuedRef.current = result.queued;
        setPendingText(trimmed);
        setSentCommands((prev) =>
          [{ id: `${Date.now()}`, text: trimmed, at: Date.now() }, ...prev].slice(0, 20),
        );
      } catch (error) {
        if (isUnauthorized(error)) {
          setAuthError("token rejected, re-pair");
        }
        const message = error instanceof Error ? error.message : "Command failed";
        setActionError(message);
        throw error;
      }
    },
    [pairing],
  );

  const sendAudio = useCallback(
    async (uri: string) => {
      const current = pairing;
      if (!current) {
        throw new ApiError(0, "unpaired", "Not paired with a Mac");
      }
      setActionError(null);
      try {
        const result = await postAudioFile(current, uri);
        const label = result.text.trim() || "(voice)";
        sawQueuedRef.current = result.queued;
        setPendingText(label);
        setSentCommands((prev) =>
          [{ id: `${Date.now()}`, text: label, at: Date.now() }, ...prev].slice(0, 20),
        );
      } catch (error) {
        if (isUnauthorized(error)) {
          setAuthError("token rejected, re-pair");
        }
        const message = error instanceof Error ? error.message : "Audio failed";
        setActionError(message);
        throw error;
      }
    },
    [pairing],
  );

  const sendPhoto = useCallback(
    async (uri: string, text?: string, audioUri?: string) => {
      const current = pairing;
      if (!current) {
        throw new ApiError(0, "unpaired", "Not paired with a Mac");
      }
      setActionError(null);
      try {
        const result = await postPhotoFile(current, uri, text, audioUri);
        const label = result.text.trim() || text?.trim() || "(photo)";
        sawQueuedRef.current = result.queued;
        setPendingText(label);
        setSentCommands((prev) =>
          [{ id: `${Date.now()}`, text: label, at: Date.now() }, ...prev].slice(0, 20),
        );
      } catch (error) {
        if (isUnauthorized(error)) {
          setAuthError("token rejected, re-pair");
        }
        const message = error instanceof Error ? error.message : "Photo failed";
        setActionError(message);
        throw error;
      }
    },
    [pairing],
  );

  const sendControl = useCallback(
    async (action: ControlAction) => {
      const current = pairing;
      if (!current) {
        throw new ApiError(0, "unpaired", "Not paired with a Mac");
      }
      setActionError(null);
      try {
        await postControl(current, action);
      } catch (error) {
        if (isUnauthorized(error)) {
          setAuthError("token rejected, re-pair");
        }
        const message = error instanceof Error ? error.message : "Control failed";
        setActionError(message);
        throw error;
      }
    },
    [pairing],
  );

  const refresh = useCallback(async () => {
    const current = pairing;
    if (!current) return;
    lastScreenAtRef.current = null;
    setScreenEpoch((n) => n + 1);
    try {
      const next = await getStatus(current);
      applyStatus(next);
      setConnection("connected");
      setAuthError(null);
    } catch (error) {
      if (isUnauthorized(error)) {
        setAuthError("token rejected, re-pair");
        setConnection("offline");
        return;
      }
      setConnection("offline");
    }
  }, [pairing, applyStatus]);

  const clearActionError = useCallback(() => setActionError(null), []);

  const value = useMemo<JarvisContextValue>(
    () => ({
      ready,
      pairing,
      connection,
      status,
      authError,
      actionError,
      sentCommands,
      optimisticQueued: pendingText !== null,
      screenUri,
      screenLoading,
      speechPlaying,
      savePairingAndConnect,
      forgetMac,
      sendCommand,
      sendAudio,
      sendPhoto,
      sendControl,
      refresh,
      clearActionError,
    }),
    [
      ready,
      pairing,
      connection,
      status,
      authError,
      actionError,
      sentCommands,
      pendingText,
      screenUri,
      screenLoading,
      speechPlaying,
      savePairingAndConnect,
      forgetMac,
      sendCommand,
      sendAudio,
      sendPhoto,
      sendControl,
      refresh,
      clearActionError,
    ],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}
