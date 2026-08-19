import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import * as Haptics from "expo-haptics";

import { AUDIO_MAX_BYTES, AUDIO_MAX_SECONDS } from "@/api/client";
import { colors } from "@/theme";

const TAP_MS = 280;
const MIN_MS = 1000;

const CLIP: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: ".m4a",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    extension: ".m4a",
    outputFormat: "mpeg4",
    audioEncoder: "aac",
    maxFileSize: AUDIO_MAX_BYTES,
  },
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MEDIUM,
  },
};

type Props = {
  disabled?: boolean;
  busy?: boolean;
  requestLatch?: number;
  asCaption?: boolean;
  attached?: boolean;
  onSend: (uri: string) => Promise<void>;
};

function formatSecs(ms: number): string {
  const total = Math.min(AUDIO_MAX_SECONDS, Math.max(0, Math.floor(ms / 1000)));
  return `0:${String(total).padStart(2, "0")}`;
}

export function HoldToTalkButton({
  disabled = false,
  busy = false,
  requestLatch,
  asCaption = false,
  attached = false,
  onSend,
}: Props) {
  const recorder = useAudioRecorder(CLIP);
  const recState = useAudioRecorderState(recorder, 100);
  const [latched, setLatched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const pressStartedAt = useRef(0);
  const recordingStartedAt = useRef(0);
  const liveDurationMs = useRef(0);
  const session = useRef(false);
  const finishing = useRef(false);
  const startLock = useRef<Promise<boolean> | null>(null);
  const wasRecording = useRef(false);

  const recording = recState.isRecording || latched;
  const blocked = disabled || busy || uploading;

  liveDurationMs.current = recState.durationMillis;

  const finish = useCallback(
    async (send: boolean) => {
      if (finishing.current) return;
      finishing.current = true;
      session.current = false;
      setLatched(false);
      try {
        const duration = Math.max(
          liveDurationMs.current,
          recorder.getStatus().durationMillis || 0,
          recordingStartedAt.current > 0 ? Date.now() - recordingStartedAt.current : 0,
        );
        try {
          if (recorder.isRecording) {
            await recorder.stop();
          }
        } catch {
          // already stopped (duration cap)
        }
        try {
          await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
        } catch {
          // playback mode optional
        }
        recordingStartedAt.current = 0;
        const uri = recorder.uri;
        if (!send) return;
        if (!uri) {
          Alert.alert("Voice clip", "Recording didn't save. Try again.");
          return;
        }
        if (duration < MIN_MS) {
          Alert.alert("Voice clip", "Hold at least one second, then release.");
          return;
        }
        setUploading(true);
        await onSend(uri);
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // optional
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Couldn't send clip";
        Alert.alert("Voice clip", message);
      } finally {
        setUploading(false);
        finishing.current = false;
      }
    },
    [onSend, recorder],
  );

  useEffect(() => {
    const now = recState.isRecording;
    if (wasRecording.current && !now && session.current) {
      void finish(true);
    }
    wasRecording.current = now;
  }, [recState.isRecording, finish]);

  const start = async (fromWidget = false): Promise<boolean> => {
    if (session.current || uploading || busy) return false;
    if (!fromWidget && disabled) return false;
    if (Platform.OS === "web") {
      Alert.alert("Hold to talk", "Record a clip on the iOS or Android app.");
      return false;
    }
    const work = (async () => {
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Microphone",
            "Jarvis Remote needs the mic to send a short clip to your Mac.",
          );
          return false;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        session.current = true;
        finishing.current = false;
        recordingStartedAt.current = Date.now();
        recorder.record({ forDuration: AUDIO_MAX_SECONDS });
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
          // optional
        }
        return true;
      } catch (error) {
        session.current = false;
        const message =
          error instanceof Error ? error.message : "Couldn't start the microphone.";
        Alert.alert("Voice clip", message);
        return false;
      }
    })();
    startLock.current = work;
    return work;
  };

  useEffect(() => {
    if (!requestLatch) return;
    let cancelled = false;
    void (async () => {
      const started = await start(true);
      if (!cancelled && started) setLatched(true);
    })();
    return () => {
      cancelled = true;
    };
    // start is recreated each render; kick only when the widget asks again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLatch]);

  const onPressIn = () => {
    if (blocked) return;
    pressStartedAt.current = Date.now();
    if (latched) return;
    void start();
  };

  const onPressOut = () => {
    if (blocked) return;
    void (async () => {
      if (startLock.current) {
        const started = await startLock.current;
        if (!started) return;
      }
      const held = Date.now() - pressStartedAt.current;
      if (latched) return;
      if (held < TAP_MS && session.current) {
        setLatched(true);
        return;
      }
      void finish(true);
    })();
  };

  const onPress = () => {
    if (latched) {
      void finish(true);
    }
  };

  const label = uploading
    ? "…"
    : recording
      ? formatSecs(recState.durationMillis)
      : "mic";

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          latched
            ? asCaption
              ? "Stop recording and attach as the photo question"
              : "Stop recording and send"
            : asCaption
              ? "Hold to record a question about the photo, or tap to record"
              : "Hold to talk, or tap to record"
        }
        disabled={blocked}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        delayLongPress={10_000}
        style={({ pressed }) => [
          styles.mic,
          recording ? styles.live : null,
          attached && !recording ? styles.held : null,
          (pressed || recording) && !blocked ? styles.pressed : null,
          blocked && !recording ? styles.dimmed : null,
        ]}>
        <Text style={[styles.micText, recording ? styles.liveText : null]}>
          {uploading ? "…" : recording ? "REC" : "MIC"}
        </Text>
      </Pressable>
      <Text style={styles.caption}>
        {uploading
          ? asCaption
            ? "HOLDING"
            : "SENDING"
          : latched
            ? `${label} · ${asCaption ? "TAP KEEP" : "TAP SEND"}`
            : recording
              ? `${label} / 0:30`
              : attached
                ? "HELD"
                : asCaption
                  ? "ASK"
                  : "HOLD / TAP"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 4,
    minWidth: 52,
  },
  mic: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  live: {
    backgroundColor: colors.errorFill,
    borderColor: colors.errorBorder,
  },
  held: {
    borderColor: colors.borderStrong,
  },
  pressed: {
    opacity: 0.9,
  },
  dimmed: {
    opacity: 0.38,
  },
  micText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.text,
  },
  liveText: {
    color: colors.error,
  },
  caption: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.6,
    textAlign: "center",
  },
});
