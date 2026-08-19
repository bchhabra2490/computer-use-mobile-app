import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/app-button";
import { Panel, SettingsGlyph, StatusChip } from "@/components/chrome";
import { HoldToTalkButton } from "@/components/hold-to-talk";
import { MacScreenPreview } from "@/components/mac-screen";
import { SendPhotoButton } from "@/components/send-photo";
import { consumeComposeIntent, useComposeIntent } from "@/hooks/use-compose-intent";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useJarvis } from "@/state/jarvis-context";
import { colors, connectionColor, connectionLabel, fonts, hairline, radii } from "@/theme";

function logMatchesSent(line: string, text: string): boolean {
  return line.includes("[user]") && line.includes(text);
}

export function HomeScreen() {
  const {
    connection,
    status,
    authError,
    actionError,
    sentCommands,
    optimisticQueued,
    screenUri,
    screenLoading,
    sendCommand,
    sendAudio,
    sendPhoto,
    sendControl,
    refresh,
    clearActionError,
    speechPlaying,
  } = useJarvis();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [controlBusy, setControlBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);
  const [micKick, setMicKick] = useState(0);
  const [camKick, setCamKick] = useState(0);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingAudio, setPendingAudio] = useState<string | null>(null);

  const logRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const composeIntent = useComposeIntent();
  const connected = connection === "connected";
  const sttActive = Boolean(status?.stt_active);
  const queued = Boolean(status?.queued) || optimisticQueued;
  const agents = status?.agents ?? [];
  const logs = status?.logs ?? [];

  const pendingLocal = sentCommands.filter(
    (cmd) => !logs.some((line) => logMatchesSent(line, cmd.text)),
  );
  const latestPending = pendingLocal[0];
  const latestLog = latestPending
    ? `[phone] “${latestPending.text}”`
    : logs[logs.length - 1] ?? null;

  useEffect(() => {
    if (pinnedToBottom) {
      logRef.current?.scrollToEnd({ animated: true });
    }
  }, [logs, pendingLocal.length, pinnedToBottom]);

  useEffect(() => {
    if (!composeIntent) return;
    if (composeIntent.text) setDraft(composeIntent.text);
    if (composeIntent.action === "type") {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (composeIntent.action === "mic") {
      setMicKick(composeIntent.id);
    } else if (composeIntent.action === "cam") {
      setCamKick(composeIntent.id);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    consumeComposeIntent(composeIntent.id);
  }, [composeIntent]);

  const onSendComposer = async () => {
    const text = draft.trim();
    if (!connected || sending) return;
    if (!pendingPhoto && !text) return;
    setSending(true);
    try {
      if (pendingPhoto) {
        await sendPhoto(pendingPhoto, text || undefined, pendingAudio || undefined);
        setPendingPhoto(null);
        setPendingAudio(null);
      } else {
        await sendCommand(text);
      }
      setDraft("");
      Keyboard.dismiss();
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // haptics optional
      }
    } catch {
      // actionError is set by the provider
    } finally {
      setSending(false);
    }
  };

  const onFinishListen = () => {
    if (!sttActive || !connected) return;
    setControlBusy("send");
    void sendControl("send").finally(() => setControlBusy(null));
  };

  const onMarkDone = () => {
    const run = () => {
      setControlBusy("mark_done");
      void sendControl("mark_done").finally(() => setControlBusy(null));
    };
    if (agents.length > 0) {
      Alert.alert("Mark done?", "Tell the running computer-use job to finish?", [
        { text: "Cancel", style: "cancel" },
        { text: "Mark done", style: "destructive", onPress: run },
      ]);
      return;
    }
    run();
  };

  const onQuit = () => {
    Alert.alert("Stop Jarvis on the Mac?", "The orchestrator will exit. Start it again on the Mac when you want it back.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Quit",
        style: "destructive",
        onPress: () => {
          setControlBusy("quit");
          void sendControl("quit").finally(() => setControlBusy(null));
        },
      },
    ]);
  };

  const state = status?.state ?? "offline";
  const detail = status?.detail ?? "";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>JARVIS</Text>
            <Text style={styles.subtitle}>Remote</Text>
          </View>
          <View style={styles.headerRight}>
            <StatusChip
              label={connectionLabel(connection)}
              tone={connectionColor(connection)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => router.push("/settings")}
              hitSlop={12}
              style={styles.gear}>
              <SettingsGlyph />
            </Pressable>
          </View>
        </View>

        {authError ? (
          <Pressable onPress={() => router.push("/settings")} style={styles.banner}>
            <Text style={styles.bannerKicker}>AUTH</Text>
            <Text style={styles.bannerText}>{authError} — tap to re-pair</Text>
          </Pressable>
        ) : null}
        {actionError ? (
          <Pressable onPress={clearActionError} style={styles.banner}>
            <Text style={styles.bannerKicker}>ERROR</Text>
            <Text style={styles.bannerText}>{actionError}</Text>
          </Pressable>
        ) : null}

        <ScrollView
          ref={logRef}
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            const distance =
              contentSize.height - (layoutMeasurement.height + contentOffset.y);
            setPinnedToBottom(distance < 64);
          }}
          onContentSizeChange={() => {
            if (pinnedToBottom) logRef.current?.scrollToEnd({ animated: false });
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.accent}
              onRefresh={() => {
                setRefreshing(true);
                void refresh().finally(() => setRefreshing(false));
              }}
            />
          }>
          <MacScreenPreview
            uri={screenUri}
            width={status?.screen_width ?? null}
            height={status?.screen_height ?? null}
            state={state}
            detail={detail}
            loading={screenLoading}
          />

          {queued || status?.task ? (
            <Panel
              label="Task"
              accessory={
                queued ? <Text style={styles.queuedText}>QUEUED</Text> : null
              }>
              {status?.task ? (
                <Text style={styles.task} numberOfLines={3}>
                  {status.task}
                </Text>
              ) : (
                <Text style={styles.taskMuted}>Waiting for the next job.</Text>
              )}
            </Panel>
          ) : null}

          <Panel
            label="Last spoken"
            accessory={
              status?.reply_sink === "phone" || status?.photo_at ? (
                <View style={styles.saidAccessories}>
                  {status?.reply_sink === "phone" ? (
                    <Text style={styles.queuedText}>{speechPlaying ? "PLAYING" : "PHONE"}</Text>
                  ) : null}
                  {status?.photo_at ? (
                    <Text style={styles.queuedText}>
                      {status.photo_pending ? "LOOKING" : "PHOTO HELD"}
                    </Text>
                  ) : null}
                </View>
              ) : null
            }>
            {status?.last_spoken ? (
              <Text selectable style={styles.saidText}>
                {status.last_spoken}
              </Text>
            ) : (
              <Text style={styles.saidEmpty}>No utterance yet.</Text>
            )}
          </Panel>

          {agents.length > 0 ? (
            <Panel label="Agents">
              <View style={styles.agents}>
                {agents.map((agent) => (
                  <View key={agent.id} style={styles.agentRow}>
                    <View style={styles.flex}>
                      <Text style={styles.agentKind}>{agent.kind ?? "agent"}</Text>
                      {agent.task ? (
                        <Text style={styles.agentTask} numberOfLines={2}>
                          {agent.task}
                        </Text>
                      ) : null}
                    </View>
                    <AppButton
                      label="Mark done"
                      variant="danger"
                      disabled={!connected}
                      busy={controlBusy === "mark_done"}
                      onPress={onMarkDone}
                    />
                  </View>
                ))}
              </View>
            </Panel>
          ) : null}

          <Panel
            label="Activity"
            onHeaderPress={() => setActivityOpen((open) => !open)}
            headerAccessibilityLabel={activityOpen ? "Collapse activity" : "Expand activity"}
            accessory={
              <Text style={styles.sectionChevron}>{activityOpen ? "COLLAPSE" : "EXPAND"}</Text>
            }>
            {activityOpen ? (
              <>
                {logs.length === 0 && pendingLocal.length === 0 ? (
                  <Text style={styles.logEmpty}>No log lines yet</Text>
                ) : null}
                {logs.map((line, index) => (
                  <Text key={`${index}-${line}`} selectable style={styles.logLine}>
                    {line}
                  </Text>
                ))}
                {pendingLocal.map((cmd) => (
                  <Text key={cmd.id} style={styles.logPending}>
                    [phone] “{cmd.text}”
                  </Text>
                ))}
              </>
            ) : latestLog ? (
              <Text
                selectable
                numberOfLines={2}
                style={latestPending ? styles.logPending : styles.logLine}>
                {latestLog}
              </Text>
            ) : (
              <Text style={styles.logEmpty}>No log lines yet</Text>
            )}
          </Panel>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 8),
            },
          ]}>
          <View style={styles.controls}>
            <AppButton
              label="Send"
              caption="Finish Mac listen"
              flex
              disabled={!connected || !sttActive}
              busy={controlBusy === "send"}
              onPress={onFinishListen}
            />
            <AppButton
              label="Mark done"
              flex
              disabled={!connected}
              busy={controlBusy === "mark_done"}
              onPress={onMarkDone}
            />
            <AppButton
              label="Quit"
              variant="danger"
              flex
              disabled={!connected}
              busy={controlBusy === "quit"}
              onPress={onQuit}
            />
          </View>

          {pendingPhoto ? (
            <View style={styles.attach}>
              <Image source={{ uri: pendingPhoto }} style={styles.thumb} contentFit="cover" />
              <View style={styles.flex}>
                <Text style={styles.attachKicker}>
                  {pendingAudio ? "PHOTO + MIC" : "PHOTO"}
                </Text>
                <Text style={styles.attachHint}>
                  {draft.trim()
                    ? "Typed text is the question. Mic clip is ignored."
                    : pendingAudio
                      ? "The clip is the question. Type to override. Empty uses the Mac default."
                      : "Type a question or hold MIC. Empty uses the Mac default."}
                </Text>
              </View>
              {pendingAudio ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove attached voice question"
                  onPress={() => setPendingAudio(null)}
                  hitSlop={10}
                  style={styles.attachRemove}>
                  <Text style={styles.attachRemoveText}>MIC ✕</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove attached photo"
                onPress={() => {
                  setPendingPhoto(null);
                  setPendingAudio(null);
                }}
                hitSlop={10}
                style={styles.attachRemove}>
                <Text style={styles.attachRemoveText}>✕</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              placeholder={
                !connected
                  ? "Offline"
                  : pendingPhoto
                    ? pendingAudio
                      ? "Optional: override the voice question…"
                      : "Type a question, or hold MIC…"
                    : "Command or photo question…"
              }
              placeholderTextColor={colors.faint}
              multiline
              style={styles.input}
              selectionColor={colors.accent}
              editable={connected && !sending}
              onFocus={() => {
                requestAnimationFrame(() => {
                  logRef.current?.scrollToEnd({ animated: true });
                });
              }}
            />
            <HoldToTalkButton
              disabled={!connected}
              busy={sending}
              asCaption={Boolean(pendingPhoto)}
              attached={Boolean(pendingAudio)}
              requestLatch={micKick}
              onSend={async (uri) => {
                if (pendingPhoto) {
                  setPendingAudio(uri);
                  return;
                }
                await sendAudio(uri);
              }}
            />
            <SendPhotoButton
              disabled={!connected}
              busy={sending}
              attached={Boolean(pendingPhoto)}
              requestCapture={camKick}
              onPicked={(uri) => {
                setPendingPhoto(uri);
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
            />
            <AppButton
              label="Send"
              variant="primary"
              disabled={!connected || sending || (!pendingPhoto && draft.trim().length === 0)}
              busy={sending}
              onPress={() => void onSendComposer()}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 3.2,
  },
  subtitle: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gear: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.elevated,
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.errorFill,
    borderRadius: radii.md,
    borderWidth: hairline,
    borderColor: colors.errorBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  bannerKicker: {
    color: colors.error,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  bannerText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  queuedText: {
    color: colors.queued,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  saidAccessories: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  task: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  taskMuted: {
    color: colors.muted,
    fontSize: 13,
  },
  saidText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  saidEmpty: {
    color: colors.muted,
    fontSize: 13,
  },
  agents: {
    gap: 8,
  },
  agentRow: {
    backgroundColor: colors.elevated,
    borderRadius: radii.sm,
    borderWidth: hairline,
    borderColor: colors.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  agentKind: {
    color: colors.progress,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  agentTask: {
    color: colors.text,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  sectionChevron: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  logLine: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.mono,
  },
  logPending: {
    color: colors.queued,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.mono,
  },
  logEmpty: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: fonts.mono,
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    gap: 8,
    borderTopWidth: hairline,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  controls: {
    flexDirection: "row",
    gap: 8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  attach: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.elevated,
    borderWidth: hairline,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 8,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  attachKicker: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  attachHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  attachRemove: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  attachRemoveText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: hairline,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
